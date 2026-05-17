const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

// ── UTILIZADOR ──
const utilizadorSchema = new mongoose.Schema({
  nome:   { type: String, required: true },
  email:  { type: String, required: true, unique: true },
  senha:  { type: String, required: true },
  perfil: { type: String, enum: ['aluno','funcionario','gestor'], default: 'aluno' },
  ativo:  { type: Boolean, default: true }
}, { timestamps: true });

// Hash da senha antes de guardar
utilizadorSchema.pre('save', async function(next) {
  if (!this.isModified('senha')) return next();
  this.senha = await bcrypt.hash(this.senha, 10);
  next();
});

// Verificar senha
utilizadorSchema.methods.verificarSenha = function(senha) {
  return bcrypt.compare(senha, this.senha);
};

// ── CURSO ──
const cursoSchema = new mongoose.Schema({
  nome:         { type: String, required: true },
  descricao:    String,
  duracaoAnos:  { type: Number, default: 3 },
  ativo:        { type: Boolean, default: true },
  criadoPor:    { type: mongoose.Schema.Types.ObjectId, ref: 'Utilizador' }
}, { timestamps: true });

// ── UC (Unidade Curricular) ──
const ucSchema = new mongoose.Schema({
  nome:        { type: String, required: true },
  descricao:   String,
  creditos:    { type: Number, default: 6 },
  horasSemana: { type: Number, default: 4 }
}, { timestamps: true });

// ── PLANO DE ESTUDOS ──
const planoSchema = new mongoose.Schema({
  curso:    { type: mongoose.Schema.Types.ObjectId, ref: 'Curso', required: true },
  uc:       { type: mongoose.Schema.Types.ObjectId, ref: 'UC', required: true },
  ano:      { type: Number, required: true, min: 1, max: 5 },
  semestre: { type: Number, required: true, min: 1, max: 2 }
}, { timestamps: true });

// Previne duplicações
planoSchema.index({ curso: 1, uc: 1, ano: 1, semestre: 1 }, { unique: true });

// ── FICHA DE ALUNO ──
const fichaSchema = new mongoose.Schema({
  utilizador:    { type: mongoose.Schema.Types.ObjectId, ref: 'Utilizador', required: true, unique: true },
  curso:         { type: mongoose.Schema.Types.ObjectId, ref: 'Curso' },
  dataNascimento: Date,
  telefone:      String,
  morada:        String,
  naturalidade:  String,
  nacionalidade: { type: String, default: 'Portuguesa' },
  foto:          String,
  estado:        { type: String, enum: ['rascunho','submetida','aprovada','rejeitada'], default: 'rascunho' },
  observacoes:   String,
  validadoPor:   { type: mongoose.Schema.Types.ObjectId, ref: 'Utilizador' },
  validadoEm:    Date
}, { timestamps: true });

// ── MATRÍCULA ──
const matriculaSchema = new mongoose.Schema({
  utilizador:  { type: mongoose.Schema.Types.ObjectId, ref: 'Utilizador', required: true },
  curso:       { type: mongoose.Schema.Types.ObjectId, ref: 'Curso', required: true },
  anoLetivo:   { type: String, required: true },
  estado:      { type: String, enum: ['pendente','aprovada','rejeitada'], default: 'pendente' },
  observacoes: String,
  decididoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilizador' },
  decididoEm:  Date
}, { timestamps: true });

// Previne matrículas duplicadas
matriculaSchema.index({ utilizador: 1, curso: 1, anoLetivo: 1 }, { unique: true });

// ── PAUTA ──
const pautaSchema = new mongoose.Schema({
  uc:        { type: mongoose.Schema.Types.ObjectId, ref: 'UC', required: true },
  curso:     { type: mongoose.Schema.Types.ObjectId, ref: 'Curso', required: true },
  anoLetivo: { type: String, required: true },
  epoca:     { type: String, enum: ['Normal','Recurso','Especial'], required: true },
  criadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilizador' }
}, { timestamps: true });

pautaSchema.index({ uc: 1, curso: 1, anoLetivo: 1, epoca: 1 }, { unique: true });

// ── NOTA ──
const notaSchema = new mongoose.Schema({
  pauta:      { type: mongoose.Schema.Types.ObjectId, ref: 'Pauta', required: true },
  utilizador: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilizador', required: true },
  nota:       { type: Number, min: 0, max: 20 },
  observacoes: String,
  editadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilizador' },
  editadoEm:  Date
}, { timestamps: true });

notaSchema.index({ pauta: 1, utilizador: 1 }, { unique: true });

module.exports = {
  Utilizador: mongoose.model('Utilizador', utilizadorSchema),
  Curso:      mongoose.model('Curso', cursoSchema),
  UC:         mongoose.model('UC', ucSchema),
  Plano:      mongoose.model('Plano', planoSchema),
  Ficha:      mongoose.model('Ficha', fichaSchema),
  Matricula:  mongoose.model('Matricula', matriculaSchema),
  Pauta:      mongoose.model('Pauta', pautaSchema),
  Nota:       mongoose.model('Nota', notaSchema),
};