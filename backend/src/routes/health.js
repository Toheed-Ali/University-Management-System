const express = require('express');
const { sequelize } = require('../db');

const router = express.Router();

router.get('/health', async (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=120');
  let dbStatus = 'disconnected';

  try {
    await sequelize.authenticate();
    dbStatus = 'connected';
  } catch (error) {
    dbStatus = 'error';
  }

  res.json({
    success: true,
    status: 'ok',
    database: 'MySQL',
    dbStatus,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
