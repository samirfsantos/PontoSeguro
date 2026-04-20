'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Empresa extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Empresa.init({
    id_empresa: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    razao_social: DataTypes.STRING,
    nome_fantasia: DataTypes.STRING,
    cnpj: DataTypes.STRING,
    inscricao_estadual: DataTypes.STRING,
    endereco: DataTypes.STRING,
    cidade: DataTypes.STRING,
    estado: DataTypes.STRING,
    cep: DataTypes.STRING,
    telefone: DataTypes.STRING,
    email: DataTypes.STRING,
    data_cadastro: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'Empresa',
    tableName: 'empresa',
    timestamps: false
  });
  return Empresa;
};