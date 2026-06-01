'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('shortcuts', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },

      user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },

      shortcut: {
        type: Sequelize.STRING,
        allowNull: false
      },

      title: {
        type: Sequelize.STRING,
        allowNull: false
      },

      message: {
        type: Sequelize.TEXT,
        allowNull: false
      },

      active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
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

    await queryInterface.addIndex('shortcuts', ['user_id']);
    await queryInterface.addIndex('shortcuts', ['shortcut']);
    await queryInterface.addIndex('shortcuts', ['active']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('shortcuts');
  }
};
