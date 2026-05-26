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
