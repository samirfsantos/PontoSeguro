require('dotenv').config(); // Carrega as variáveis do arquivo .env

module.exports = {
  // Configurações para o ambiente de desenvolvimento (localhost)
  development: {
    // Se nao configurar o .env, ou se não encontrar ele, vai usar o que está entre as aspas
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || '123456',
    database: process.env.DB_NAME || 'pontoseguro',
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
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