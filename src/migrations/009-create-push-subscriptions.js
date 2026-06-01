'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('push_subscriptions', {
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

      endpoint: {
        type: Sequelize.TEXT,
        allowNull: false
      },

      p256dh: {
        type: Sequelize.TEXT,
        allowNull: false
      },

      auth: {
        type: Sequelize.TEXT,
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

    await queryInterface.addIndex('push_subscriptions', ['cliente_id_externo']);
    await queryInterface.addIndex('push_subscriptions', ['conversation_id']);
    await queryInterface.addIndex('push_subscriptions', ['endpoint'], {
      unique: true,
      name: 'push_subscriptions_endpoint_unique',
      length: 191
    }).catch(() => queryInterface.addIndex('push_subscriptions', ['endpoint'], {
      unique: true,
      name: 'push_subscriptions_endpoint_unique'
    }));
  },

  async down(queryInterface) {
    await queryInterface.dropTable('push_subscriptions');
  }
};
