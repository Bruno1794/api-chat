'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('settings', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },

      key: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },

      value: {
        type: Sequelize.JSON,
        allowNull: false
      },

      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },

      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex('settings', ['key'], {
      unique: true,
      name: 'settings_key_unique'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('settings');
  }
};
