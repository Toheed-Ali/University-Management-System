/**
 * Migration: create login_rate_limits table.
 *
 * Replaces the in-memory loginAttempts Map in auth.js with a DB-backed
 * store that survives process restarts and works across multiple Node
 * instances (e.g. PM2 cluster mode).
 */
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('login_rate_limits', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      ip_key: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
        comment: 'Client IP address used as the rate-limit key'
      },
      attempts: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      window_start: {
        type: Sequelize.BIGINT,
        allowNull: false,
        comment: 'Unix timestamp (ms) when the current window started'
      },
      blocked_until: {
        type: Sequelize.BIGINT,
        allowNull: true,
        defaultValue: null,
        comment: 'Unix timestamp (ms) until which this IP is hard-blocked. NULL = not blocked.'
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });

    await queryInterface.addIndex('login_rate_limits', ['ip_key'], {
      name: 'idx_login_rate_limits_ip_key'
    });
    await queryInterface.addIndex('login_rate_limits', ['window_start'], {
      name: 'idx_login_rate_limits_window_start'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('login_rate_limits');
  }
};
