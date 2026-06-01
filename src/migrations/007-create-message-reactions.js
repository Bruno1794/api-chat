'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('message_reactions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },

      message_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'messages',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },

      actor_type: {
        type: Sequelize.ENUM('CLIENTE', 'ATENDENTE'),
        allowNull: false
      },

      actor_id: {
        type: Sequelize.STRING,
        allowNull: true
      },

      emoji: {
        type: Sequelize.STRING,
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

    await queryInterface.addIndex('message_reactions', ['message_id']);
    await queryInterface.addIndex('message_reactions', ['message_id', 'actor_type', 'actor_id'], {
      unique: true,
      name: 'message_reactions_actor_unique'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('message_reactions');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_message_reactions_actor_type;').catch(() => null);
  }
};
