'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('registro_ponto', {
      id_registro: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      id_funcionario: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'funcionario',
          key: 'id_funcionario'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      id_empresa: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'empresa',
          key: 'id_empresa'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      tipo: {
        type: Sequelize.ENUM('entrada', 'intervalo_saida', 'intervalo_retorno', 'saida'),
        allowNull: false
      },
      batida: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      latitude: {
        type: Sequelize.DECIMAL(9,6)
      },
      longitude: {
        type: Sequelize.DECIMAL(9,6)
      },
      precisao_gps: {
        type: Sequelize.FLOAT
      },
      comprovante_hash: {
        type: Sequelize.TEXT
      },
      offline: {
        type: Sequelize.BOOLEAN
      },
      dispositivo_id: {
        type: Sequelize.STRING
      },
      status: {
        type: Sequelize.ENUM('pendente', 'sincronizado', 'rejeitado'),
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
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('registro_ponto');
  }
};