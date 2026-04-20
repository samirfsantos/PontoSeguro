'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class RegistroPonto extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
// Aqui diz que o ponto pertence a um funcionario
      this.belongsTo(models.funcionario, { foreignKey: 'id_funcionario' });    
      this.belongsTo(models.Empresa, { foreignKey: 'id_empresa' }); }
  }
  RegistroPonto.init({
    id_registro : {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    id_funcionario: { type: DataTypes.INTEGER, allowNull: false},
    id_empresa: { type: DataTypes.INTEGER, allowNull: false},
    tipo: { type: DataTypes.ENUM('entrada', 'intervalo_saida', 'intervalo_retorno', 'saida'), allowNull: false },
    batida: DataTypes.DATE,
    latitude: DataTypes.DECIMAL,
    longitude: DataTypes.DECIMAL,
    precisao_gps: DataTypes.FLOAT,
    comprovante_hash: DataTypes.TEXT,
    offline: DataTypes.BOOLEAN,
    dispositivo_id: DataTypes.STRING,
    status: DataTypes.ENUM('pendente', 'sincronizado', 'rejeitado'),
    data_cadastro: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    data_atualizacao: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, {
    sequelize,
    modelName: 'RegistroPonto',
    tableName: 'registro_ponto',
    timestamps: false
  });
  return RegistroPonto;
};