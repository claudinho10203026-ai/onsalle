const { supabaseAdmin, criarClienteDoUsuario } = require('../config/supabaseClient');

// Valida o token enviado pelo front-end (Authorization: Bearer <token>)
// e injeta req.usuario (dados do usuário logado) e req.supabase
// (client autenticado, que respeita RLS).
async function autenticar(req, res, next) {
  if (!supabaseAdmin) {
    return res.status(503).json({ erro: 'Supabase não configurado. Defina as chaves no arquivo .env antes de usar autenticação.' });
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ erro: 'Token de autenticação não enviado' });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data?.user) {
    return res.status(401).json({ erro: 'Token inválido ou expirado' });
  }

  req.usuario = data.user;
  req.token = token;
  req.supabase = criarClienteDoUsuario(token);

  if (!req.supabase) {
    return res.status(503).json({ erro: 'Supabase não configurado para clientes autenticados.' });
  }

  next();
}

module.exports = { autenticar };
