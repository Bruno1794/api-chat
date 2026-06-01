const { DataTypes, Model } = require('sequelize');

class Note extends Model {
  static initModel(sequelize) {
    Note.init(
      {
        conversation_id: {
          type: DataTypes.INTEGER,
          allowNull: false
        },

        user_id: {
          type: DataTypes.INTEGER,
          allowNull: false
        },

        note: {
          type: DataTypes.TEXT,
          allowNull: false
        }
      },
      {
        sequelize,
        tableName: 'notes',
        modelName: 'Note',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false
      }
    );

    return Note;
  }

  static associate(models) {
    Note.belongsTo(models.Conversation, {
      foreignKey: 'conversation_id',
      as: 'conversation'
    });

    Note.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
  }
}

module.exports = Note;
