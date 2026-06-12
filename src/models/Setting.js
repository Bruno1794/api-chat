const { Model, DataTypes } = require('sequelize');

class Setting extends Model {
  static initModel(sequelize) {
    Setting.init(
      {
        key: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: true
        },
        value: {
          type: DataTypes.JSON,
          allowNull: false
        }
      },
      {
        sequelize,
        tableName: 'settings',
        underscored: true
      }
    );

    return Setting;
  }
}

module.exports = Setting;
