'use strict';

// Importação de módulos nativos do Node e do Sequelize
const fs = require('fs'); // Serve para ler os arquivos
const path = require('path'); // Serve para manipular caminhos de pastas
const Sequelize = require('sequelize');
const basename = path.basename(__filename); // Pega o nome deste arquivo (index.js) para não importar ele mesmo
const env = process.env.NODE_ENV || 'development'; // Define se está em modo de desenvolvimento ou produção
const config = require('../config/config.js')[env]; // Busca as credenciais do banco no seu config.js
const db = {}; // Objeto que vai guardar todos os modelos (ex: db.funcionario)

let sequelize;
// 1. Configuração da Conexão
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}

// 2. Leitura Automática de Modelos
fs
  .readdirSync(__dirname) // Lê todos os arquivos dentro da pasta 'models'
  .filter(file => {
    // Filtra para pegar apenas arquivos .js e que não sejam o próprio index.js
    return (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js');
  })
  .forEach(file => {
    // Para cada arquivo encontrado (ex: funcionario.js), ele inicializa o modelo no Sequelize
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model; // Adiciona o modelo ao nosso objeto 'db'
  });

// 3. Configuração de Relacionamentos (Associações)
Object.keys(db).forEach(modelName => {
  // Se o modelo tiver uma função "associate" (ex: um funcionário pertence a um cargo), ele executa essa função
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

// 4. Exportação
db.sequelize = sequelize; // Exporta a instância da conexão (usada para sincronizar o banco)
db.Sequelize = Sequelize; // Exporta a biblioteca Sequelize

module.exports = db; // Exporta tudo para ser usado no AuthController, app.js, etc.