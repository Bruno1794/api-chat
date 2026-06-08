'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('pix_charges', {
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

      message_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'messages',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },

      created_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },

      fastdepix_transaction_id: {
        type: Sequelize.STRING,
        allowNull: false
      },

      depix_transaction_id: {
        type: Sequelize.STRING,
        allowNull: true
      },

      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },

      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'pending'
      },

      qr_code: {
        type: Sequelize.TEXT,
        allowNull: true
      },

      qr_code_text: {
        type: Sequelize.TEXT,
        allowNull: true
      },

      qr_code_expires_at: {
        type: Sequelize.DATE,
        allowNull: true
      },

      notification_url: {
        type: Sequelize.STRING(1024),
        allowNull: true
      },

      paid_at: {
        type: Sequelize.DATE,
        allowNull: true
      },

      expired_at: {
        type: Sequelize.DATE,
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

    await queryInterface.addIndex('pix_charges', ['conversation_id']);
    await queryInterface.addIndex('pix_charges', ['message_id']);
    await queryInterface.addIndex('pix_charges', ['status']);
    await queryInterface.addIndex('pix_charges', ['qr_code_expires_at']);
    await queryInterface.addIndex('pix_charges', ['fastdepix_transaction_id'], {
      unique: true,
      name: 'pix_charges_fastdepix_transaction_id_unique'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('pix_charges');
  }
};
