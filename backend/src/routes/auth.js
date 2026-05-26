const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const User = require('../models/User');
const { sequelize } = require('../db');
const { config } = require('../config');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ─── Rate-limit constants ─────────────────────────────────────────────────────
const LOGIN_WINDOW_MS   = 15 * 60 * 1000; // 15 minutes
const LOGIN_MAX_ATTEMPTS = 10;             // attempts before hard-block
const BLOCK_DURATION_MS  = 15 * 60 * 1000; // how long a hard-block lasts

// ─── DB-backed rate limiter ───────────────────────────────────────────────────
//
// Replaces the previous in-memory Map so that:
//   • limits survive process restarts
//   • limits are shared across multiple Node instances (PM2 cluster, etc.)
//
// Uses raw SQL via the existing Sequelize connection — no extra dependency.

/**
 * Check and record a login attempt for the given IP.
 * Returns true if the request should be blocked.
 */
async function checkRateLimit(ipKey) {
  const now = Date.now();

  // Use a single UPSERT-style query wrapped in a transaction so concurrent
  // requests from the same IP don't race past the limit.
  const result = await sequelize.transaction(async (t) => {
    const [rows] = await sequelize.query(
      'SELECT id, attempts, window_start, blocked_until FROM login_rate_limits WHERE ip_key = ? LIMIT 1',
      { replacements: [ipKey], transaction: t, type: sequelize.QueryTypes.SELECT }
    );

    const row = rows; // QueryTypes.SELECT returns the first row directly when using LIMIT 1

    if (!row) {
      // First attempt from this IP — insert a fresh window
      await sequelize.query(
        `INSERT INTO login_rate_limits (ip_key, attempts, window_start, blocked_until, createdAt, updatedAt)
         VALUES (?, 1, ?, NULL, NOW(), NOW())`,
        { replacements: [ipKey, now], transaction: t }
      );
      return { blocked: false };
    }

    // Still inside a hard-block period
    if (row.blocked_until && now < Number(row.blocked_until)) {
      return { blocked: true };
    }

    const windowExpired = now - Number(row.window_start) > LOGIN_WINDOW_MS;

    if (windowExpired) {
      // Start a fresh window
      await sequelize.query(
        'UPDATE login_rate_limits SET attempts = 1, window_start = ?, blocked_until = NULL, updatedAt = NOW() WHERE id = ?',
        { replacements: [now, row.id], transaction: t }
      );
      return { blocked: false };
    }

    const newAttempts = Number(row.attempts) + 1;
    const shouldBlock = newAttempts > LOGIN_MAX_ATTEMPTS;
    const blockedUntil = shouldBlock ? now + BLOCK_DURATION_MS : null;

    await sequelize.query(
      'UPDATE login_rate_limits SET attempts = ?, blocked_until = ?, updatedAt = NOW() WHERE id = ?',
      { replacements: [newAttempts, blockedUntil, row.id], transaction: t }
    );

    return { blocked: shouldBlock };
  });

  return result.blocked;
}

/**
 * Prune rows whose window expired more than 24 hours ago.
 * Runs once per hour in the background — fire-and-forget.
 */
function scheduleRateLimitCleanup() {
  const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
  const STALE_THRESHOLD_MS  = 24 * 60 * 60 * 1000; // 24 hours

  const cleanup = async () => {
    try {
      const cutoff = Date.now() - STALE_THRESHOLD_MS;
      const [, meta] = await sequelize.query(
        'DELETE FROM login_rate_limits WHERE window_start < ? AND (blocked_until IS NULL OR blocked_until < ?)',
        { replacements: [cutoff, Date.now()] }
      );
      const deleted = meta?.affectedRows ?? 0;
      if (deleted > 0) {
        console.log(`[RateLimit] Pruned ${deleted} stale rate-limit row(s)`);
      }
    } catch (err) {
      console.error('[RateLimit] Cleanup error:', err.message);
    }
  };

  // Delay first run by 5 minutes so it doesn't fire during startup
  setTimeout(() => {
    cleanup();
    setInterval(cleanup, CLEANUP_INTERVAL_MS).unref();
  }, 5 * 60 * 1000).unref();
}

scheduleRateLimitCleanup();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getClientIp(req) {
  return String(req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown');
}

function signToken(user) {
  return jwt.sign(
    {
      sub: String(user.id),
      role: user.role,
      tokenVersion: user.tokenVersion
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

function sanitizeUser(user) {
  const { passwordHash, ...sanitized } = user.toJSON();
  return sanitized;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// POST /auth/login
router.post(
  '/auth/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).trim()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: 'Invalid input', details: errors.array() });
    }

    try {
      const ipKey = getClientIp(req);
      const blocked = await checkRateLimit(ipKey);
      if (blocked) {
        return res.status(429).json({ success: false, error: 'Too many login attempts. Please try again later.' });
      }

      const { email, password } = req.body;

      const user = await User.findOne({ where: { email: String(email).toLowerCase() } });
      if (!user) return res.status(401).json({ success: false, error: 'Invalid email or password' });

      const ok = await bcrypt.compare(String(password), user.passwordHash);
      if (!ok) return res.status(401).json({ success: false, error: 'Invalid email or password' });

      if (user.status !== 'active') {
        return res.status(403).json({ success: false, error: 'Account is not active' });
      }

      user.lastLogin = new Date();
      await user.save();

      const token = signToken(user);
      return res.json({ success: true, token, user: sanitizeUser(user) });
    } catch (err) {
      console.error('Login error:', err);
      return res.status(500).json({ success: false, error: 'Login failed' });
    }
  }
);

// GET /auth/me
router.get('/auth/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    return res.json({ success: true, user: sanitizeUser(user) });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      console.warn('Auth check: Token expired');
    } else {
      console.error('Auth check error:', err);
    }
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
});

// POST /auth/logout
//
// FIX: Increment tokenVersion so the current JWT is immediately rejected by
// requireAuth on any subsequent request — even before the token's natural
// expiry. This is the same mechanism used on password change.
router.post('/auth/logout', requireAuth, async (req, res) => {
  try {
    await User.increment('tokenVersion', { where: { id: req.user.id } });
    return res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    // Still return success to the client — the token will expire naturally
    return res.json({ success: true, message: 'Logged out successfully' });
  }
});

module.exports = router;
