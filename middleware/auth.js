// Verifica se está logado
exports.exigirLogin = (req, res, next) => {
  if (!req.session.user) return res.redirect('/login');
  next();
};

// Verifica perfil específico
exports.exigirPerfil = (...perfis) => (req, res, next) => {
  if (!req.session.user) return res.redirect('/login');
  if (!perfis.includes(req.session.user.perfil)) return res.redirect('/login');
  next();
};