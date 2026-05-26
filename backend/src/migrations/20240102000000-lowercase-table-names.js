/**
 * Migration: normalise table names to lowercase.
 *
 * Renames:  Batches  → batches
 *           Sections → sections
 *
 * MySQL on Windows/macOS is case-insensitive by default, so existing data is
 * preserved. On Linux (case-sensitive filesystem) these tables may already be
 * lowercase — the migration handles that gracefully by checking first.
 */
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const tables = await queryInterface.showAllTables();

    if (tables.includes('Batches') && !tables.includes('batches')) {
      await queryInterface.renameTable('Batches', 'batches');
      console.log('  ✅ Renamed table Batches → batches');
    } else {
      console.log('  ℹ️  Table batches already lowercase — skipping');
    }

    if (tables.includes('Sections') && !tables.includes('sections')) {
      await queryInterface.renameTable('Sections', 'sections');
      console.log('  ✅ Renamed table Sections → sections');
    } else {
      console.log('  ℹ️  Table sections already lowercase — skipping');
    }
  },

  async down(queryInterface) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('batches') && !tables.includes('Batches')) {
      await queryInterface.renameTable('batches', 'Batches');
    }
    if (tables.includes('sections') && !tables.includes('Sections')) {
      await queryInterface.renameTable('sections', 'Sections');
    }
  }
};
