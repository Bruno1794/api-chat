'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('conversations', {
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

      atendente_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },

      status: {
        type: Sequelize.ENUM(
          'ABERTA',
          'AGUARDANDO_CLIENTE',
          'FINALIZADA',
          'ARQUIVADA'
        ),
        allowNull: false,
        defaultValue: 'ABERTA'
      },

      ultima_mensagem: {
        type: Sequelize.TEXT,
        allowNull: true
      },

      ultima_interacao: {
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

    await queryInterface.addIndex('conversations', ['cliente_id_externo']);
    await queryInterface.addIndex('conversations', ['atendente_id']);
    await queryInterface.addIndex('conversations', ['status']);
    await queryInterface.addIndex('conversations', ['ultima_interacao']);
    await queryInterface.addIndex(
      'conversations',
      ['cliente_id_externo', 'status'],
      {
        name: 'conversations_cliente_status_index'
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('conversations');
  }
};
