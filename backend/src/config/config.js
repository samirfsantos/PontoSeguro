require('dotenv').config(); // Carrega as variáveis do arquivo .env
const path = require('path');

module.exports = {
  // Configurações para o ambiente de desenvolvimento (SQLite para simplicidade)
  development: {
    // SQLite em desenvolvimento (arquivo local)
    dialect: 'sqlite',
    storage: path.resolve(__dirname, '..', '..', 'pontoseguro.db'),
    logging: console.log
  },

  // Configurações para o ambiente de produção (servidor Render)
  production: {
    // URL única que já contém tudo por isso que nao temos que configurar cada variavel individualmente
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgres',
    logging: false, // Desativa logs de SQL em produção para maior performance e segurança
    dialectOptions: {
      ssl: {
        require: true, // O Render exige conexão segura (SSL) para o banco de dados
        rejectUnauthorized: false // Permite conexões com certificados autoassinados (padrão em nuvem)
      }
    }
  }
};