'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('attachments', {
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

      filename: {
        type: Sequelize.STRING,
        allowNull: false
      },

      path: {
        type: Sequelize.STRING,
        allowNull: false
      },

      mime_type: {
        type: Sequelize.STRING,
        allowNull: false
      },

      size: {
        type: Sequelize.INTEGER,
        allowNull: false
      }
    });

    await queryInterface.addIndex('attachments', ['message_id']);
    await queryInterface.addIndex('attachments', ['filename']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('attachments');
  }
};
