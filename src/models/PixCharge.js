const { DataTypes, Model } = require('sequelize');

class PixCharge extends Model {
  static initModel(sequelize) {
    PixCharge.init(
      {
        conversation_id: {
          type: DataTypes.INTEGER,
          allowNull: false
        },

        message_id: {
          type: DataTypes.INTEGER,
          allowNull: true
        },

        created_by: {
          type: DataTypes.INTEGER,
          allowNull: true
        },

        fastdepix_transaction_id: {
          type: DataTypes.STRING,
          allowNull: false
        },

        depix_transaction_id: {
          type: DataTypes.STRING,
          allowNull: true
        },

        amount: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false
        },

        status: {
          type: DataTypes.STRING,
          allowNull: false,
          defaultValue: 'pending'
        },

        qr_code: {
          type: DataTypes.TEXT,
          allowNull: true
        },

        qr_code_text: {
          type: DataTypes.TEXT,
          allowNull: true
        },

        qr_code_expires_at: {
          type: DataTypes.DATE,
          allowNull: true
        },

        notification_url: {
          type: DataTypes.STRING(1024),
          allowNull: true
        },

        paid_at: {
          type: DataTypes.DATE,
          allowNull: true
        },

        expired_at: {
          type: DataTypes.DATE,
          allowNull: true
        }
      },
      {
        sequelize,
        tableName: 'pix_charges',
        modelName: 'PixCharge',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
      }
    );

    return PixCharge;
  }

  static associate(models) {
    PixCharge.belongsTo(models.Conversation, {
      foreignKey: 'conversation_id',
      as: 'conversation'
    });

    PixCharge.belongsTo(models.Message, {
      foreignKey: 'message_id',
      as: 'message'
    });

    PixCharge.belongsTo(models.User, {
      foreignKey: 'created_by',
      as: 'creator'
    });
  }
}

module.exports = PixCharge;
