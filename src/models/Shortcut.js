const { DataTypes, Model } = require('sequelize');

class Shortcut extends Model {
  static initModel(sequelize) {
    Shortcut.init(
      {
        user_id: {
          type: DataTypes.INTEGER,
          allowNull: true
        },

        shortcut: {
          type: DataTypes.STRING,
          allowNull: false
        },

        title: {
          type: DataTypes.STRING,
          allowNull: false
        },

        message: {
          type: DataTypes.TEXT,
          allowNull: false
        },

        active: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true
        }
      },
      {
        sequelize,
        tableName: 'shortcuts',
        modelName: 'Shortcut',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
      }
    );

    return Shortcut;
  }

  static associate(models) {
    Shortcut.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
  }
}

module.exports = Shortcut;
