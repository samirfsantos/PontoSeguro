'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Solicitacao extends Model {
    static associate(models) {
      this.belongsTo(models.Funcionario, { foreignKey: 'id_funcionario' });
      this.belongsTo(models.Empresa, { foreignKey: 'id_empresa' });
    }
  }

  Solicitacao.init(
    {
      id_solicitacao: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      id_funcionario: { type: DataTypes.INTEGER, allowNull: false },
      id_empresa: { type: DataTypes.INTEGER, allowNull: false },
      tipo: { type: DataTypes.STRING, allowNull: false },
      descricao: { type: DataTypes.TEXT, allowNull: false },
      data_referencia: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      status: { type: DataTypes.ENUM('pendente', 'aprovado', 'negado'), allowNull: false, defaultValue: 'pendente' },
      data_cadastro: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      data_atualizacao: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
    },
    {
      sequelize,
      modelName: 'Solicitacao',
      tableName: 'solicitacao',
      timestamps: false
    }
  );

  return Solicitacao;
};