const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Funcionario } = require('../models');

module.exports = {
  async login(req, res) {
    const { email, password } = req.body;

    try {
      // 1. Busca o usuário pelo email
      const user = await Funcionario.findOne({ where: { email } });

      if (!user) {
        return res.status(401).json({ error: 'Usuário não encontrado' });
      }

      // 2. Verifica se a senha está correta
      const passwordMatch = await bcrypt.compare(password, user.senha);

      if (!passwordMatch) {
        return res.status(401).json({ error: 'Senha incorreta' });
      }

      // 3. Gera um token JWT
      const token = jwt.sign({ id: user.id_funcionario }, process.env.JWT_SECRET, {
        expiresIn: '1d',
      });

      // 4. Retorna os dados do usuário e o token
      return res.json({
        user: {
          id: user.id_funcionario,
          name: user.nome,
          email: user.email
        },
        token: token
      });

    } catch (error) {
      console.error(error); // Bom para você debugar no terminal
      return res.status(500).json({ error: 'Erro interno no servidor' });
    }
  }
};