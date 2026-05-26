/**
 * Sequelize CLI configuration.
 * Used by: npm run migrate / migrate:undo / migrate:status
 *
 * Reads the same .env file as the application so credentials
 * never need to be duplicated.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

module.exports = {
  development: {
    username: process.env.DB_USER     || 'root',
    password: process.env.DB_PASS     || null,
    database: process.env.DB_NAME     || 'university_cms',
    host:     process.env.DB_HOST     || '127.0.0.1',
    port:     parseInt(process.env.DB_PORT || '3306', 10),
    dialect:  'mysql',
    logging:  false
  },
  test: {
    username: process.env.DB_USER     || 'root',
    password: process.env.DB_PASS     || null,
    database: process.env.DB_NAME_TEST || 'university_cms_test',
    host:     process.env.DB_HOST     || '127.0.0.1',
    port:     parseInt(process.env.DB_PORT || '3306', 10),
    dialect:  'mysql',
    logging:  false
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    host:     process.env.DB_HOST,
    port:     parseInt(process.env.DB_PORT || '3306', 10),
    dialect:  'mysql',
    logging:  false,
    pool: {
      max:     parseInt(process.env.DB_POOL_MAX     || '5',  10),
      min:     parseInt(process.env.DB_POOL_MIN     || '0',  10),
      acquire: parseInt(process.env.DB_POOL_ACQUIRE || '30000', 10),
      idle:    parseInt(process.env.DB_POOL_IDLE    || '10000', 10)
    }
  }
};
