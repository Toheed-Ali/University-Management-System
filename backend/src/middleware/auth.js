const jwt = require('jsonwebtoken');
const { config } = require('../config');

const User = require('../models/User');

async function requireAuth(req, res, next) {
  const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`);

  let token = '';
  const header = req.headers.authorization || '';
  const [type, headerToken] = header.split(' ');

  if (type === 'Bearer' && headerToken) {
    token = headerToken;
  }

  if (!token) {
    log(`[AUTH] Missing token. Path: ${req.path}`);
    return res.status(401).json({ success: false, error: 'Missing authentication token' });
  }

  try {
    // Verify JWT with proper expiration check
    const payload = jwt.verify(token, config.jwtSecret);

    // Additional checks for security
    if (payload.exp && payload.exp < Date.now() / 1000) {
      throw new Error('Token expired');
    }

    const user = await User.findByPk(payload.sub);

    if (!user) {
      log(`[AUTH] User not found (${payload.sub}). Path: ${req.path}`);
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    if (user.status !== 'active') {
      log(`[AUTH] Account not active (${user.email}). Status: ${user.status}. Path: ${req.path}`);
      return res.status(403).json({ success: false, error: 'Account is not active' });
    }

    if (payload.tokenVersion !== undefined && payload.tokenVersion !== user.tokenVersion) {
      log(`[AUTH] Session expired (${user.email}). Path: ${req.path}`);
      return res.status(401).json({ success: false, error: 'Session expired/Password changed' });
    }

    req.user = user;
    return next();
  } catch (err) {
    log(`[AUTH] Invalid token. Error: ${err.message}. Path: ${req.path}`);
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`);

    if (!req.user) {
      log(`[ROLE] No user. Approved: [${roles.join(', ')}]. Path: ${req.path}`);
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }
    
    if (!roles.includes(req.user.role)) {
      console.warn(`[ROLE-DEBUG] Forbidden. User role '${req.user.role}' not in [${roles.join(', ')}]. Path: ${req.path}`);
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    
    return next();
  };
}

module.exports = { requireAuth, requireRole };
