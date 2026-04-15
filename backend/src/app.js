const express = require('express');
const cors = require('cors');
require('dotenv').config();


//sempre que criar um router, tem que importar ele aqui
//const routes = require('./routes/routes');

// Importamos o Controller diretamente aqui
const AuthController = require('./controllers/AuthController');

const app = express();

// Middlewares Globais
app.use(cors()); // Permite acesso de diferentes origens (Web e Mobile)
app.use(express.json()); // Configura a API para entender dados em formato JSON

// Rota Inicial (Apenas para testar se a API está online)
app.get('/', (req, res) => {
  res.json({ 
    projeto: "PontoSeguro API",
    status: "Online",
    versao: "1.0.0" 
  });
});

app.post('/login', AuthController.login);


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em: http://localhost:${PORT}`);
  console.log(`🛠️  Ambiente atual: ${process.env.NODE_ENV || 'development'}`);
});