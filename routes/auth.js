const express      = require('express');
const router       = express.Router();
const { Utilizador } = require('../models');

// Redirect raiz
router.get('/', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const destinos = { gestor: '/admin', funcionario: '/funcionario', aluno: '/aluno' };
  res.redirect(destinos[req.session.user.perfil] || '/login');
});

// GET Login
router.get('/login', (req, res) => {
  if (req.session.user) {
    const destinos = { gestor: '/admin', funcionario: '/funcionario', aluno: '/aluno' };
    return res.redirect(destinos[req.session.user.perfil]);
  }
  res.render('auth/login', { erro: null });
});

// POST Login
router.post('/login', async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) return res.render('auth/login', { erro: 'Preencha todos os campos.' });

  const user = await Utilizador.findOne({ email, ativo: true });
  if (!user || !(await user.verificarSenha(senha))) {
    return res.render('auth/login', { erro: 'E-mail ou senha incorretos.' });
  }

  req.session.user = { id: user._id, nome: user.nome, perfil: user.perfil };
  const destinos = { gestor: '/admin', funcionario: '/funcionario', aluno: '/aluno' };
  res.redirect(destinos[user.perfil]);
});

// GET Registro
router.get('/registro', (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('auth/registro', { erro: null, sucesso: null });
});

// POST Registro
router.post('/registro', async (req, res) => {
  const { nome, email, senha, confirmar } = req.body;
  if (!nome || !email || !senha) return res.render('auth/registro', { erro: 'Preencha todos os campos.', sucesso: null });
  if (senha.length < 6) return res.render('auth/registro', { erro: 'Senha mínimo 6 caracteres.', sucesso: null });
  if (senha !== confirmar) return res.render('auth/registro', { erro: 'As senhas não coincidem.', sucesso: null });

  const existe = await Utilizador.findOne({ email });
  if (existe) return res.render('auth/registro', { erro: 'E-mail já registado.', sucesso: null });

  await Utilizador.create({ nome, email, senha, perfil: 'aluno' });
  res.render('auth/registro', { erro: null, sucesso: 'Conta criada! Pode fazer login.' });
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

module.exports = router;