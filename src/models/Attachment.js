const { DataTypes, Model } = require('sequelize');

class Attachment extends Model {
  static initModel(sequelize) {
    Attachment.init(
      {
        message_id: {
          type: DataTypes.INTEGER,
          allowNull: false
        },

        filename: {
          type: DataTypes.STRING,
          allowNull: false
        },

        path: {
          type: DataTypes.STRING,
          allowNull: false
        },

        mime_type: {
          type: DataTypes.STRING,
          allowNull: false
        },

        size: {
          type: DataTypes.INTEGER,
          allowNull: false
        }
      },
      {
        sequelize,
        tableName: 'attachments',
        modelName: 'Attachment',
        underscored: true,
        timestamps: false
      }
    );

    return Attachment;
  }

  static associate(models) {
    Attachment.belongsTo(models.Message, {
      foreignKey: 'message_id',
      as: 'message'
    });
  }
}

module.exports = Attachment;
