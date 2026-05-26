const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const compression = require('compression');

const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const { config } = require('./config');

const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/students');
const teacherRoutes = require('./routes/teachers');
const departmentRoutes = require('./routes/departments');
const courseRoutes = require('./routes/courses');
const dashboardRoutes = require('./routes/dashboard');
const offeringRoutes = require('./routes/offerings');
const batchRoutes = require('./routes/batches');
const sectionRoutes = require('./routes/sections');
const settingsRoutes = require('./routes/settings');
const lectureRoutes = require('./routes/lectures');
const attendanceRoutes = require('./routes/attendance');
const assignmentRoutes = require('./routes/assignments');

function createApp() {
  const app = express();
  app.set('etag', 'strong');

  // ── HTTPS enforcement ────────────────────────────────────────────────────────
  // When ENFORCE_HTTPS=true (set this in production behind a TLS terminator),
  // HTTP requests are redirected to HTTPS and HSTS is sent on every response.
  //
  // Do NOT enable this in local development — it will break plain-HTTP requests.
  //
  // If the app sits behind a reverse proxy (nginx, AWS ALB, etc.) that terminates
  // TLS, set TRUST_PROXY=true so Express reads the X-Forwarded-Proto header
  // correctly instead of always seeing req.protocol as 'http'.
  const enforceHttps = process.env.ENFORCE_HTTPS === 'true';
  if (enforceHttps) {
    app.set('trust proxy', 1); // trust first proxy hop for X-Forwarded-Proto
    app.use((req, res, next) => {
      if (req.protocol !== 'https') {
        // 301 permanent redirect — browsers and crawlers will cache this
        return res.redirect(301, `https://${req.headers.host}${req.url}`);
      }
      next();
    });
  }

  const appendVary = (res, value) => {
    const existing = String(res.getHeader('Vary') || '');
    const values = existing
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
    if (!values.includes(value)) values.push(value);
    if (values.length > 0) res.setHeader('Vary', values.join(', '));
  };

  // Middleware
  const allowedOrigins = String(process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.use(cors({
    origin(origin, cb) {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return cb(null, true);
      }
      return cb(new Error('CORS policy: origin not allowed'));
    }
  }));
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    // HSTS: tell browsers to only connect via HTTPS for the next year.
    // Only sent when ENFORCE_HTTPS is active so local dev is unaffected.
    if (enforceHttps) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  });
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(compression());
  app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));
  app.use((req, res, next) => {
    const isApi = req.path.startsWith('/api/v1');
    if (!isApi) return next();

    appendVary(res, 'Accept-Encoding');
    appendVary(res, 'Authorization');

    const isRead = req.method === 'GET' || req.method === 'HEAD';
    if (!isRead) {
      res.setHeader('Cache-Control', 'no-store');
      return next();
    }

    const isHealth = req.path === '/api/v1/health';
    const isAuthRoute = req.path.startsWith('/api/v1/auth');
    const isSubmissionFileRoute = req.path.includes('/submissions/');
    const hasAuthorization = Boolean(req.headers.authorization);

    if (isHealth) {
      res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=120');
    } else if (isAuthRoute || isSubmissionFileRoute || hasAuthorization) {
      // Prevent shared/public caches from serving user-specific responses.
      res.setHeader('Cache-Control', 'private, no-store');
    } else {
      // Allow browser revalidation for generic GET endpoints.
      res.setHeader('Cache-Control', 'private, no-cache, max-age=0, must-revalidate');
    }

    return next();
  });

  // Swagger API Documentation
  if (config.env !== 'production') {
    const swaggerDocument = require('../swagger.json');
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  }

  // Routes (v1)
  app.use('/api/v1', healthRoutes);
  app.use('/api/v1', authRoutes);
  app.use('/api/v1', assignmentRoutes); // Moved up
  app.use('/api/v1', studentRoutes);
  app.use('/api/v1', teacherRoutes);
  app.use('/api/v1', departmentRoutes);
  app.use('/api/v1', courseRoutes);
  app.use('/api/v1/offerings', offeringRoutes);
  app.use('/api/v1/batches', batchRoutes);
  app.use('/api/v1/sections', sectionRoutes);
  app.use('/api/v1/settings', settingsRoutes);
  app.use('/api/v1', dashboardRoutes);
  app.use('/api/v1', lectureRoutes);
  app.use('/api/v1', attendanceRoutes);

  // 404 handler for API routes ONLY (matches /api/v1/* if not handled above)
  app.use('/api/v1/*', (req, res) => res.status(404).json({ success: false, error: 'Endpoint not found' }));

  // Error handler
  app.use((err, req, res, next) => {
    if (err?.name === 'MulterError') {
      if (err.code === 'LIMIT_FILE_SIZE') {
        const maxMb = Number.parseInt(process.env.MAX_SUBMISSION_FILE_MB || '25', 10);
        return res.status(413).json({
          success: false,
          error: `File too large. Maximum allowed size is ${Math.max(1, maxMb)} MB per file`
        });
      }
      return res.status(400).json({ success: false, error: `Upload error: ${err.code}` });
    }

    console.error('Server error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  });

  // Serve static files from the React app
  app.use(express.static(path.join(__dirname, '../../frontend/dist'), {
    etag: true,
    maxAge: '1y',
    immutable: true,
    index: false,
    setHeaders(res, staticPath) {
      if (staticPath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'public, no-cache, max-age=0, must-revalidate');
      }
    }
  }));

  // The "catchall" handler: for any request that doesn't
  // match one above, send back React's index.html file.
  app.get('*', (req, res) => {
    const indexPath = path.join(__dirname, '../../frontend/dist/index.html');
    if (fs.existsSync(indexPath)) {
      res.setHeader('Cache-Control', 'public, no-cache, max-age=0, must-revalidate');
      res.sendFile(indexPath);
    } else {
      res.status(404).send('Frontend build not found. Please run build in the frontend directory.');
    }
  });

  return app;
}

module.exports = { createApp };
