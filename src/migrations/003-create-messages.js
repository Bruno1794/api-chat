'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('messages', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },

      conversation_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'conversations',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },

      sender_type: {
        type: Sequelize.ENUM('CLIENTE', 'ATENDENTE', 'SISTEMA'),
        allowNull: false
      },

      sender_id: {
        type: Sequelize.STRING,
        allowNull: true
      },

      message: {
        type: Sequelize.TEXT,
        allowNull: true
      },

      message_type: {
        type: Sequelize.ENUM('TEXT', 'IMAGE', 'FILE', 'AUDIO'),
        allowNull: false,
        defaultValue: 'TEXT'
      },

      read: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },

      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex('messages', ['conversation_id']);
    await queryInterface.addIndex('messages', ['sender_type']);
    await queryInterface.addIndex('messages', ['read']);
    await queryInterface.addIndex('messages', ['created_at']);
    await queryInterface.addIndex(
      'messages',
      ['conversation_id', 'read', 'sender_type'],
      {
        name: 'messages_unread_counter_index'
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('messages');
  }
};
