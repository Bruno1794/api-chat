'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('expo_push_tokens');

    if (!table.cliente_id_externo) {
      await queryInterface.addColumn('expo_push_tokens', 'cliente_id_externo', {
        type: Sequelize.STRING(255),
        allowNull: true
      });
    }

    if (!table.conversation_id) {
      await queryInterface.addColumn('expo_push_tokens', 'conversation_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'conversations',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      });
    }

    if (table.user_id && table.user_id.allowNull === false) {
      await queryInterface.changeColumn('expo_push_tokens', 'user_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      });
    }

    await queryInterface.addIndex('expo_push_tokens', ['cliente_id_externo'], {
      name: 'expo_push_tokens_cliente_id_externo_idx'
    }).catch(() => undefined);
    await queryInterface.addIndex('expo_push_tokens', ['conversation_id'], {
      name: 'expo_push_tokens_conversation_id_idx'
    }).catch(() => undefined);
  },

  async down(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('expo_push_tokens');

    if (table.conversation_id) {
      await queryInterface.removeColumn('expo_push_tokens', 'conversation_id');
    }

    if (table.cliente_id_externo) {
      await queryInterface.removeColumn('expo_push_tokens', 'cliente_id_externo');
    }

    if (table.user_id) {
      await queryInterface.changeColumn('expo_push_tokens', 'user_id', {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      });
    }
  }
};