//versao inicial, só um rabujo, ainda precisa das demais impementações, como o model de usuário, validação, etc.

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
// Importar o Model de Usuário aqui (quando ele for criado)

module.exports = {
  async login(req, res) {
    const { email, password } = req.body;

    return res.json({ 
      user: { id: 1, name: "Samir" }, 
      token: "TOKEN_GERADO_AQUI" 
    });
  }
};