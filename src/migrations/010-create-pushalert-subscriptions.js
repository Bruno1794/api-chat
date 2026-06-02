'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('pushalert_subscriptions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },

      cliente_id_externo: {
        type: Sequelize.STRING,
        allowNull: false
      },

      conversation_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'conversations',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },

      subscriber_id: {
        type: Sequelize.STRING,
        allowNull: false
      },

      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true
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

    await queryInterface.addIndex('pushalert_subscriptions', ['cliente_id_externo']);
    await queryInterface.addIndex('pushalert_subscriptions', ['conversation_id']);
    await queryInterface.addIndex('pushalert_subscriptions', ['subscriber_id'], {
      unique: true,
      name: 'pushalert_subscriptions_subscriber_unique'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('pushalert_subscriptions');
  }
};