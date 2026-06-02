const { DataTypes, Model } = require('sequelize');

class PushSubscription extends Model {
  static initModel(sequelize) {
    PushSubscription.init(
      {
        cliente_id_externo: {
          type: DataTypes.STRING,
          allowNull: true
        },

        user_id: {
          type: DataTypes.INTEGER,
          allowNull: true
        },

        conversation_id: {
          type: DataTypes.INTEGER,
          allowNull: true
        },

        endpoint: {
          type: DataTypes.TEXT,
          allowNull: false
        },

        p256dh: {
          type: DataTypes.TEXT,
          allowNull: false
        },

        auth: {
          type: DataTypes.TEXT,
          allowNull: false
        },

        user_agent: {
          type: DataTypes.TEXT,
          allowNull: true
        }
      },
      {
        sequelize,
        tableName: 'push_subscriptions',
        modelName: 'PushSubscription',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
      }
    );

    return PushSubscription;
  }

  static associate(models) {
    PushSubscription.belongsTo(models.Conversation, {
      foreignKey: 'conversation_id',
      as: 'conversation'
    });

    PushSubscription.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
  }
}

module.exports = PushSubscription;
