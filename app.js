require('dotenv').config();
const express    = require('express');
const mongoose   = require('mongoose');
const session    = require('express-session');
const MongoStore = require('connect-mongo');
const path       = require('path');

const app = express();

// ── Ligação ao MongoDB ──
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB ligado!'))
  .catch(err => console.error('❌ Erro MongoDB:', err));

// ── Configurações ──
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Sessões ──
app.use(session({
  secret: process.env.SESSION_SECRET || 'studyplan_secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // 24 horas
}));

// ── Variável global para views ──
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// ── Rotas ──
app.use('/',            require('./routes/auth'));
app.use('/admin',       require('./routes/admin'));
app.use('/funcionario', require('./routes/funcionario'));
app.use('/aluno',       require('./routes/aluno'));

// ── Iniciar servidor ──
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor a correr em http://localhost:${PORT}`);
});