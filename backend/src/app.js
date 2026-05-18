const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();


//sempre que criar um router, tem que importar ele aqui
const routes = require('./routes/routes');
const { sequelize, Funcionario, Empresa } = require('./models');

const app = express();

// Middlewares Globais
app.use(cors()); // Permite acesso de diferentes origens (Web e Mobile)
app.use(express.json()); // Configura a API para entender dados em formato JSON
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.use(routes);

// Rota Inicial (Apenas para testar se a API está online)
app.get('/', (req, res) => {
  res.json({
    projeto: "PontoSeguro API",
    status: "Online",
    versao: "2.0.0"
  });
});

const PORT = process.env.PORT || 3000;
const isSqlite = sequelize.getDialect && sequelize.getDialect() === 'sqlite';

sequelize
  .sync(isSqlite ? {} : { alter: true })
  .then(() => {
    return Promise.all([
      Empresa.findByPk(1).then(found => {
        if (found) return found;
        return Empresa.create({
          id_empresa: 1,
          razao_social: 'Empresa Padrao PontoSeguro',
          nome_fantasia: 'PontoSeguro',
          cnpj: '00000000000001',
          endereco: 'Endereco nao informado',
          cidade: 'Nao informado',
          estado: 'NA',
          cep: '00000000',
          data_cadastro: new Date()
        });
      }),
      Funcionario.findOne({ where: { perfil: 'rh' } }).then(async found => {
        const senha = await bcrypt.hash('12345', 8);
        if (found) {
          await found.update({
            cpf: '12345678900',
            senha,
            perfil: 'rh',
            cargo: 'RH',
            status: 'ativo',
            data_atualizacao: new Date()
          });
          return found;
        }
        return Funcionario.create({
          id_empresa: 1,
          nome: 'RH Administrador',
          cpf: '12345678900',
          email: 'rh@pontoseguro.com',
          senha,
          cargo: 'RH',
          perfil: 'rh',
          jornada: '08:00-17:00',
          status: 'ativo',
          data_cadastro: new Date(),
          data_atualizacao: new Date()
        });
      })
    ]);
  })
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Servidor rodando em: http://localhost:${PORT}`);
      console.log(`Ambiente atual: ${process.env.NODE_ENV || 'development'}`);
      console.log('Acesso RH inicial: cpf 12345678900 | senha 12345');
    });
  })
  .catch(error => {
    console.error('Falha ao sincronizar banco:', error);
    process.exit(1);
  });