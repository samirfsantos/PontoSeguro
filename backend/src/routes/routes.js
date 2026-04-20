const express = require('express');
const routes = express.Router();
const AuthController = require('../controllers/AuthController');

// Rota de teste
routes.get('/', (req, res) => res.send('API PontoSeguro Rodando!'));

// Rota de Login (a que vamos testar)
routes.post('/login', AuthController.login);

module.exports = routes;