'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Funcionario extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
// Aqui diz que o funcionário pertence a uma empresa
      this.belongsTo(models.Empresa, { foreignKey: 'id_empresa' });    }
  }
  Funcionario.init({
    id_funcionario: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    id_empresa:{type: DataTypes.INTEGER, allowNull: false},
    nome: DataTypes.STRING,
    cpf: DataTypes.STRING,
    contato: DataTypes.STRING,
    pis_pasep: DataTypes.STRING,
    email: DataTypes.STRING,
    senha: DataTypes.STRING,
    cargo: DataTypes.STRING,
    salario: DataTypes.DECIMAL,
    data_admissao: DataTypes.DATE,
    status: DataTypes.STRING,
    data_cadastro: {type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    data_atualizacao: {type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    sequelize,
    modelName: 'Funcionario',
    tableName: 'funcionario',
    timestamps: false
  });
  return Funcionario;
};