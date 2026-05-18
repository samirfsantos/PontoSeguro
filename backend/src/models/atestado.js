'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Atestado extends Model {
    static associate(models) {
      this.belongsTo(models.Funcionario, { foreignKey: 'id_funcionario' });
      this.belongsTo(models.Empresa, { foreignKey: 'id_empresa' });
    }
  }

  Atestado.init(
    {
      id_atestado: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      id_funcionario: { type: DataTypes.INTEGER, allowNull: false },
      id_empresa: { type: DataTypes.INTEGER, allowNull: false },
      descricao: { type: DataTypes.TEXT, allowNull: false },
      data_referencia: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      arquivo_nome: { type: DataTypes.STRING, allowNull: false },
      arquivo_path: { type: DataTypes.STRING, allowNull: false },
      status: { type: DataTypes.ENUM('pendente', 'aprovado', 'negado'), allowNull: false, defaultValue: 'pendente' },
      data_cadastro: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      data_atualizacao: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
    },
    {
      sequelize,
      modelName: 'Atestado',
      tableName: 'atestado',
      timestamps: false
    }
  );

  return Atestado;
};