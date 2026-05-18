'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('atestado', {
      id_atestado: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      id_funcionario: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'funcionario', key: 'id_funcionario' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      id_empresa: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'empresa', key: 'id_empresa' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      descricao: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      data_referencia: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      arquivo_nome: {
        type: Sequelize.STRING,
        allowNull: false
      },
      arquivo_path: {
        type: Sequelize.STRING,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('pendente', 'aprovado', 'negado'),
        allowNull: false,
        defaultValue: 'pendente'
      },
      data_cadastro: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      data_atualizacao: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('atestado');
  }
};