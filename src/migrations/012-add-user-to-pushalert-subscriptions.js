'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('pushalert_subscriptions', 'cliente_id_externo', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn('pushalert_subscriptions', 'user_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });

    await queryInterface.addIndex('pushalert_subscriptions', ['user_id'], {
      name: 'pushalert_subscriptions_user_id'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex(
      'pushalert_subscriptions',
      'pushalert_subscriptions_user_id'
    );
    await queryInterface.removeColumn('pushalert_subscriptions', 'user_id');

    await queryInterface.changeColumn('pushalert_subscriptions', 'cliente_id_externo', {
      type: Sequelize.STRING,
      allowNull: false
    });
  }
};
