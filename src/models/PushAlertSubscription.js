const { DataTypes, Model } = require('sequelize');

class PushAlertSubscription extends Model {
  static initModel(sequelize) {
    PushAlertSubscription.init(
      {
        cliente_id_externo: {
          type: DataTypes.STRING,
          allowNull: false
        },

        conversation_id: {
          type: DataTypes.INTEGER,
          allowNull: true
        },

        subscriber_id: {
          type: DataTypes.STRING,
          allowNull: false
        },

        user_agent: {
          type: DataTypes.TEXT,
          allowNull: true
        }
      },
      {
        sequelize,
        tableName: 'pushalert_subscriptions',
        modelName: 'PushAlertSubscription',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
      }
    );

    return PushAlertSubscription;
  }

  static associate(models) {
    PushAlertSubscription.belongsTo(models.Conversation, {
      foreignKey: 'conversation_id',
      as: 'conversation'
    });
  }
}

module.exports = PushAlertSubscription;