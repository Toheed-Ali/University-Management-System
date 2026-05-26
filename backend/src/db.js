const { Sequelize } = require('sequelize');
const mysql = require('mysql2/promise');
const { config } = require('./config');

// NODE_ENV is used to decide whether auto-sync is allowed.
// In production, tables must be managed via migrations (npm run migrate).
// In development/test, sync({ alter: false }) creates missing tables but
// never drops or alters existing columns — safe for local iteration.
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';

/**
 * Create database if it doesn't exist
 */
async function createDatabaseIfNotExists() {
  const connection = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.username,
    password: config.db.password
  });

  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${config.db.database}\`;`);
  console.log(`✅ Database '${config.db.database}' ready`);
  await connection.end();
}

// Create Sequelize instance
const sequelize = new Sequelize(
  config.db.database,
  config.db.username,
  config.db.password,
  {
    host: config.db.host,
    port: config.db.port,
    dialect: config.db.dialect,
    logging: config.db.logging,
    pool: config.db.pool
  }
);

async function ensureAssignmentPlagiarismThresholdColumn() {
  const queryInterface = sequelize.getQueryInterface();
  const tableDefinition = await queryInterface.describeTable('assignments');

  if (tableDefinition.plagiarismThreshold) return;

  await queryInterface.addColumn('assignments', 'plagiarismThreshold', {
    type: Sequelize.INTEGER,
    allowNull: true,
    defaultValue: 50
  });

  await sequelize.query('UPDATE assignments SET plagiarismThreshold = 50 WHERE plagiarismThreshold IS NULL');
  console.log('✅ Added missing assignments.plagiarismThreshold column');
}

/**
 * Ensure the login_rate_limits table exists.
 *
 * This table is defined in database/schema.sql (TABLE 15) and is required
 * by the auth route for DB-backed brute-force rate limiting.
 * Creating it here means the app works in development without needing to
 * manually run schema.sql first.
 */
async function ensureRateLimitTable() {
  const queryInterface = sequelize.getQueryInterface();
  const tables = await queryInterface.showAllTables();
  if (tables.includes('login_rate_limits')) return;

  await queryInterface.createTable('login_rate_limits', {
    id:            { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
    ip_key:        { type: Sequelize.STRING(255), allowNull: false, unique: true },
    attempts:      { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
    window_start:  { type: Sequelize.BIGINT, allowNull: false },
    blocked_until: { type: Sequelize.BIGINT, allowNull: true, defaultValue: null },
    createdAt:     { type: Sequelize.DATE, allowNull: false },
    updatedAt:     { type: Sequelize.DATE, allowNull: false }
  });

  await queryInterface.addIndex('login_rate_limits', ['ip_key'],       { name: 'idx_lrl_ip_key' });
  await queryInterface.addIndex('login_rate_limits', ['window_start'], { name: 'idx_lrl_window_start' });
  console.log('✅ Created login_rate_limits table');
}

/**
 * Connect to MySQL database
 */
async function connectToDatabase() {
  try {
    // First, ensure database exists
    await createDatabaseIfNotExists();

    // Then connect to it
    await sequelize.authenticate();
    console.log('✅ MySQL connection established successfully');

    if (IS_PRODUCTION) {
      // In production, never auto-sync. Tables must be managed via:
      //   npm run migrate
      // Attempting sync() in production risks silent column drops on model changes.
      console.log('ℹ️  Production mode: skipping auto-sync. Run "npm run migrate" to apply schema changes.');
    } else {
      // In development/test: create missing tables only.
      // alter:false means existing tables/columns are never modified or dropped.
      await sequelize.sync({ alter: false });
      console.log('✅ Database tables synchronized (development mode — create-only)');

      // Backfill older databases that were created before plagiarismThreshold existed.
      await ensureAssignmentPlagiarismThresholdColumn();
      // Ensure rate-limit table exists (defined in database/schema.sql TABLE 15).
      await ensureRateLimitTable();
    }

    return sequelize;
  } catch (error) {
    console.error('❌ Unable to connect to MySQL database:', error.message);

    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('   → Check your database credentials in .env file');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('   → Make sure MySQL server is running');
      console.error('   → Install MySQL: https://dev.mysql.com/downloads/mysql/');
      console.error('   → Or use XAMPP/WAMP: https://www.apachefriends.org/');
    }

    throw error;
  }
}

/**
 * Close database connection
 */
async function closeDatabase() {
  await sequelize.close();
  console.log('Database connection closed');
}

module.exports = {
  sequelize,
  connectToDatabase,
  closeDatabase
};
