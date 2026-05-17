const express  = require('express');
const router   = express.Router();
const { exigirPerfil } = require('../middleware/auth');
const { Curso, UC, Plano, Ficha, Utilizador, Matricula } = require('../models');
const auth = exigirPerfil('gestor');

// Dashboard
router.get('/', auth, async (req, res) => {
  const [totalCursos, totalUCs, totalAlunos, fichasPendentes] = await Promise.all([
    Curso.countDocuments({ ativo: true }),
    UC.countDocuments(),
    Utilizador.countDocuments({ perfil: 'aluno' }),
    Ficha.countDocuments({ estado: 'submetida' })
  ]);
  const fichasRecentes = await Ficha.find({ estado: 'submetida' })
    .populate('utilizador', 'nome email')
    .populate('curso', 'nome')
    .sort({ updatedAt: -1 }).limit(5);

  res.render('admin/dashboard', { totalCursos, totalUCs, totalAlunos, fichasPendentes, fichasRecentes });
});

// ── CURSOS ──
router.get('/cursos', auth, async (req, res) => {
  const cursos = await Curso.find().populate('criadoPor', 'nome').sort({ createdAt: -1 });
  res.render('admin/cursos', { cursos, erro: null, sucesso: null });
});

router.post('/cursos/criar', auth, async (req, res) => {
  const { nome, descricao, duracaoAnos } = req.body;
  await Curso.create({ nome, descricao, duracaoAnos, criadoPor: req.session.user.id });
  res.redirect('/admin/cursos?sucesso=Curso criado!');
});

router.post('/cursos/editar/:id', auth, async (req, res) => {
  const { nome, descricao, duracaoAnos, ativo } = req.body;
  await Curso.findByIdAndUpdate(req.params.id, { nome, descricao, duracaoAnos, ativo: ativo === 'on' });
  res.redirect('/admin/cursos?sucesso=Curso atualizado!');
});

router.get('/cursos/apagar/:id', auth, async (req, res) => {
  await Curso.findByIdAndDelete(req.params.id);
  res.redirect('/admin/cursos?sucesso=Curso removido!');
});

// ── UCs ──
router.get('/ucs', auth, async (req, res) => {
  const ucs = await UC.find().sort({ nome: 1 });
  res.render('admin/ucs', { ucs, erro: null, sucesso: null });
});

router.post('/ucs/criar', auth, async (req, res) => {
  const { nome, descricao, creditos, horasSemana } = req.body;
  await UC.create({ nome, descricao, creditos, horasSemana });
  res.redirect('/admin/ucs?sucesso=UC criada!');
});

router.get('/ucs/apagar/:id', auth, async (req, res) => {
  await UC.findByIdAndDelete(req.params.id);
  res.redirect('/admin/ucs?sucesso=UC removida!');
});

// ── PLANO DE ESTUDOS ──
router.get('/plano', auth, async (req, res) => {
  const cursos = await Curso.find({ ativo: true }).sort({ nome: 1 });
  const ucs    = await UC.find().sort({ nome: 1 });
  let plano = [], cursoSel = null;

  if (req.query.curso) {
    cursoSel = await Curso.findById(req.query.curso);
    plano = await Plano.find({ curso: req.query.curso })
      .populate('uc').sort({ ano: 1, semestre: 1 });
  }

  res.render('admin/plano', { cursos, ucs, plano, cursoSel, erro: req.query.erro || null, sucesso: req.query.sucesso || null });
});

router.post('/plano/adicionar', auth, async (req, res) => {
  const { curso, uc, ano, semestre } = req.body;
  try {
    await Plano.create({ curso, uc, ano, semestre });
    res.redirect(`/admin/plano?curso=${curso}&sucesso=UC adicionada!`);
  } catch (e) {
    res.redirect(`/admin/plano?curso=${curso}&erro=Esta UC já existe neste semestre!`);
  }
});

router.get('/plano/remover/:id', auth, async (req, res) => {
  const p = await Plano.findByIdAndDelete(req.params.id);
  res.redirect(`/admin/plano?curso=${p?.curso}&sucesso=UC removida!`);
});

// ── FICHAS ──
router.get('/fichas', auth, async (req, res) => {
  const filtro = req.query.filtro || 'submetida';
  const fichas = await Ficha.find({ estado: filtro })
    .populate('utilizador', 'nome email')
    .populate('curso', 'nome')
    .sort({ updatedAt: -1 });

  let ver = null;
  if (req.query.ver) {
    ver = await Ficha.findById(req.query.ver)
      .populate('utilizador', 'nome email')
      .populate('curso', 'nome')
      .populate('validadoPor', 'nome');
  }

  res.render('admin/fichas', { fichas, ver, filtro, sucesso: req.query.sucesso || null });
});

router.post('/fichas/decidir/:id', auth, async (req, res) => {
  const { acao, observacoes, filtro } = req.body;
  const estado = acao === 'aprovar' ? 'aprovada' : 'rejeitada';
  await Ficha.findByIdAndUpdate(req.params.id, {
    estado, observacoes,
    validadoPor: req.session.user.id,
    validadoEm: new Date()
  });
  res.redirect(`/admin/fichas?filtro=${filtro}&sucesso=Ficha ${estado}!`);
});

module.exports = router;