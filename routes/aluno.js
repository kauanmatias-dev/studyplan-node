const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const path     = require('path');
const { exigirPerfil } = require('../middleware/auth');
const { Ficha, Curso, Matricula, Nota, Pauta, UC } = require('../models');
const auth = exigirPerfil('aluno');

// Configuração do multer para upload de fotos
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads/'),
  filename:    (req, file, cb) => cb(null, `foto_${Date.now()}${path.extname(file.originalname)}`)
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    const permitidos = ['image/jpeg', 'image/png', 'image/webp'];
    if (permitidos.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Formato inválido. Use JPG, PNG ou WEBP.'));
  }
});

// Dashboard
router.get('/', auth, async (req, res) => {
  const uid = req.session.user.id;
  const ficha = await Ficha.findOne({ utilizador: uid }).populate('curso', 'nome');
  const matriculas = await Matricula.find({ utilizador: uid })
    .populate('curso', 'nome').sort({ createdAt: -1 }).limit(3);
  const notas = await Nota.find({ utilizador: uid, nota: { $ne: null } })
    .populate({ path: 'pauta', populate: [{ path: 'uc', select: 'nome creditos' }, { path: 'curso', select: 'nome' }] })
    .sort({ createdAt: -1 }).limit(5);

  res.render('aluno/dashboard', { ficha, matriculas, notas });
});

// ── FICHA ──
router.get('/ficha', auth, async (req, res) => {
  const ficha  = await Ficha.findOne({ utilizador: req.session.user.id }).populate('curso', 'nome');
  const cursos = await Curso.find({ ativo: true }).sort({ nome: 1 });
  res.render('aluno/ficha', { ficha, cursos, erro: null, sucesso: null });
});

router.post('/ficha', auth, upload.single('foto'), async (req, res) => {
  const uid = req.session.user.id;
  const ficha = await Ficha.findOne({ utilizador: uid });
  const cursos = await Curso.find({ ativo: true }).sort({ nome: 1 });

  if (ficha && ['aprovada','submetida'].includes(ficha.estado)) {
    return res.render('aluno/ficha', { ficha, cursos, erro: 'Não pode editar a ficha neste estado.', sucesso: null });
  }

  const { curso, dataNascimento, telefone, morada, naturalidade, nacionalidade, acao } = req.body;
  const estado = acao === 'submeter' ? 'submetida' : 'rascunho';

  if (estado === 'submetida' && (!curso || !dataNascimento || !telefone || !morada)) {
    return res.render('aluno/ficha', { ficha, cursos, erro: 'Preencha todos os campos obrigatórios para submeter.', sucesso: null });
  }

  const dados = { utilizador: uid, curso, dataNascimento, telefone, morada, naturalidade, nacionalidade, estado };
  if (req.file) dados.foto = req.file.filename;

  if (ficha) {
    await Ficha.findByIdAndUpdate(ficha._id, dados);
  } else {
    await Ficha.create(dados);
  }

  const fichaAtual = await Ficha.findOne({ utilizador: uid }).populate('curso', 'nome');
  const msg = estado === 'submetida' ? 'Ficha submetida para validação!' : 'Rascunho guardado!';
  res.render('aluno/ficha', { ficha: fichaAtual, cursos, erro: null, sucesso: msg });
});

// ── CURSOS ──
router.get('/cursos', auth, async (req, res) => {
  const uid    = req.session.user.id;
  const ficha  = await Ficha.findOne({ utilizador: uid });
  const cursos = await Curso.find({ ativo: true }).sort({ nome: 1 });
  const minhasMatriculas = await Matricula.find({ utilizador: uid });
  const matriculaMap = {};
  minhasMatriculas.forEach(m => { matriculaMap[m.curso.toString()] = m; });

  res.render('aluno/cursos', { cursos, ficha, matriculaMap, erro: req.query.erro || null, sucesso: req.query.sucesso || null });
});

router.post('/cursos/matricular', auth, async (req, res) => {
  const uid = req.session.user.id;
  const ficha = await Ficha.findOne({ utilizador: uid });

  if (!ficha || ficha.estado !== 'aprovada') {
    return res.redirect('/aluno/cursos?erro=Precisa de ter a ficha aprovada para se matricular.');
  }

  const { curso, anoLetivo } = req.body;
  try {
    await Matricula.create({ utilizador: uid, curso, anoLetivo });
    res.redirect('/aluno/cursos?sucesso=Pedido submetido! Aguarde aprovação.');
  } catch (e) {
    res.redirect('/aluno/cursos?erro=Já tem um pedido para este curso.');
  }
});

// ── MATRÍCULAS ──
router.get('/matriculas', auth, async (req, res) => {
  const matriculas = await Matricula.find({ utilizador: req.session.user.id })
    .populate('curso', 'nome duracaoAnos')
    .populate('decididoPor', 'nome')
    .sort({ createdAt: -1 });
  res.render('aluno/matriculas', { matriculas });
});

// ── NOTAS ──
router.get('/notas', auth, async (req, res) => {
  const notas = await Nota.find({ utilizador: req.session.user.id, nota: { $ne: null } })
    .populate({ path: 'pauta', populate: [{ path: 'uc', select: 'nome creditos' }, { path: 'curso', select: 'nome' }] })
    .sort({ createdAt: -1 });

  // Agrupar por ano letivo
  const porAno = {};
  notas.forEach(n => {
    const ano = n.pauta?.anoLetivo || 'Desconhecido';
    if (!porAno[ano]) porAno[ano] = [];
    porAno[ano].push(n);
  });

  const media = notas.length ? (notas.reduce((s, n) => s + (n.nota || 0), 0) / notas.length).toFixed(1) : null;
  const aprovadas = notas.filter(n => n.nota >= 10).length;

  res.render('aluno/notas', { porAno, media, aprovadas, total: notas.length });
});

module.exports = router;