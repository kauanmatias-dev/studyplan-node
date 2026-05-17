const express  = require('express');
const router   = express.Router();
const { exigirPerfil } = require('../middleware/auth');
const { Matricula, Pauta, Nota, Curso, UC, Plano, Utilizador } = require('../models');
const auth = exigirPerfil('funcionario');

// Dashboard
router.get('/', auth, async (req, res) => {
  const [pendentes, aprovadas, totalPautas] = await Promise.all([
    Matricula.countDocuments({ estado: 'pendente' }),
    Matricula.countDocuments({ estado: 'aprovada' }),
    Pauta.countDocuments()
  ]);
  const ultimas = await Matricula.find()
    .populate('utilizador', 'nome')
    .populate('curso', 'nome')
    .sort({ createdAt: -1 }).limit(6);

  res.render('funcionario/dashboard', { pendentes, aprovadas, totalPautas, ultimas });
});

// ── MATRÍCULAS ──
router.get('/matriculas', auth, async (req, res) => {
  const filtro = req.query.filtro || 'pendente';
  const matriculas = await Matricula.find({ estado: filtro })
    .populate('utilizador', 'nome email')
    .populate('curso', 'nome')
    .populate('decididoPor', 'nome')
    .sort({ createdAt: -1 });

  let ver = null;
  if (req.query.ver) {
    ver = await Matricula.findById(req.query.ver)
      .populate('utilizador', 'nome email')
      .populate('curso', 'nome')
      .populate('decididoPor', 'nome');
  }

  res.render('funcionario/matriculas', { matriculas, ver, filtro, sucesso: req.query.sucesso || null });
});

router.post('/matriculas/decidir/:id', auth, async (req, res) => {
  const { acao, observacoes, filtro } = req.body;
  const estado = acao === 'aprovar' ? 'aprovada' : 'rejeitada';
  await Matricula.findByIdAndUpdate(req.params.id, {
    estado, observacoes,
    decididoPor: req.session.user.id,
    decididoEm: new Date()
  });
  res.redirect(`/funcionario/matriculas?filtro=${filtro}&sucesso=Matrícula ${estado}!`);
});

// ── PAUTAS ──
router.get('/pautas', auth, async (req, res) => {
  const cursos = await Curso.find({ ativo: true }).sort({ nome: 1 });
  const pautas = await Pauta.find()
    .populate('uc', 'nome')
    .populate('curso', 'nome')
    .populate('criadoPor', 'nome')
    .sort({ createdAt: -1 });

  // UCs por curso para o filtro dinâmico
  const planos = await Plano.find().populate('uc', 'nome');
  const ucsPorCurso = {};
  planos.forEach(p => {
    const cid = p.curso.toString();
    if (!ucsPorCurso[cid]) ucsPorCurso[cid] = [];
    ucsPorCurso[cid].push({ id: p.uc._id, nome: p.uc.nome });
  });

  let pautaSel = null, notas = [];
  if (req.query.pauta) {
    pautaSel = await Pauta.findById(req.query.pauta)
      .populate('uc', 'nome').populate('curso', 'nome');
    notas = await Nota.find({ pauta: req.query.pauta })
      .populate('utilizador', 'nome');
  }

  res.render('funcionario/pautas', {
    cursos, pautas, ucsPorCurso, pautaSel, notas,
    erro: req.query.erro || null, sucesso: req.query.sucesso || null
  });
});

router.post('/pautas/criar', auth, async (req, res) => {
  const { uc, curso, anoLetivo, epoca } = req.body;
  try {
    const pauta = await Pauta.create({ uc, curso, anoLetivo, epoca, criadoPor: req.session.user.id });
    // Adicionar alunos elegíveis automaticamente
    const matriculas = await Matricula.find({ curso, estado: 'aprovada' });
    for (const m of matriculas) {
      await Nota.create({ pauta: pauta._id, utilizador: m.utilizador });
    }
    res.redirect('/funcionario/pautas?sucesso=Pauta criada!');
  } catch (e) {
    res.redirect('/funcionario/pautas?erro=Esta pauta já existe!');
  }
});

router.post('/pautas/notas/:pautaId', auth, async (req, res) => {
  const { notas, obs } = req.body;
  for (const [utilizadorId, nota] of Object.entries(notas || {})) {
    await Nota.findOneAndUpdate(
      { pauta: req.params.pautaId, utilizador: utilizadorId },
      { nota: nota === '' ? null : parseFloat(nota), observacoes: obs?.[utilizadorId] || '', editadoPor: req.session.user.id, editadoEm: new Date() }
    );
  }
  res.redirect(`/funcionario/pautas?pauta=${req.params.pautaId}&sucesso=Notas guardadas!`);
});

router.get('/pautas/apagar/:id', auth, async (req, res) => {
  await Pauta.findByIdAndDelete(req.params.id);
  await Nota.deleteMany({ pauta: req.params.id });
  res.redirect('/funcionario/pautas?sucesso=Pauta removida!');
});

module.exports = router;