'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('funcionario', 'perfil', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'colaborador'
    });

    await queryInterface.addColumn('funcionario', 'jornada', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: '08:00-17:00'
    });

    await queryInterface.addColumn('funcionario', 'departamento', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('funcionario', 'perfil');
    await queryInterface.removeColumn('funcionario', 'jornada');
    await queryInterface.removeColumn('funcionario', 'departamento');
  }
};