'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('messages', 'edited_at', {
      type: Sequelize.DATE,
      allowNull: true
    });

    await queryInterface.addColumn('messages', 'deleted_at', {
      type: Sequelize.DATE,
      allowNull: true
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('messages', 'deleted_at');
    await queryInterface.removeColumn('messages', 'edited_at');
  }
};
