'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('expo_push_tokens', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },

      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },

      token: {
        type: Sequelize.STRING(255),
        allowNull: false
      },

      platform: {
        type: Sequelize.STRING(32),
        allowNull: true
      },

      device_name: {
        type: Sequelize.STRING(255),
        allowNull: true
      },

      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true
      },

      last_registered_at: {
        type: Sequelize.DATE,
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

    await queryInterface.addIndex('expo_push_tokens', ['token'], {
      unique: true,
      name: 'expo_push_tokens_token_unique'
    });
    await queryInterface.addIndex('expo_push_tokens', ['user_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('expo_push_tokens');
  }
};
