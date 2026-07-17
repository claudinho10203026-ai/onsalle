const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY?.trim();
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

// Cliente com service_role: usado APENAS no backend, nunca exposto ao front-end.
// Se as credenciais ainda não existirem, ele fica desativado para evitar crash.
const supabaseAdmin = supabaseUrl && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey)
  : null;

// Cria um client "autenticado como o usuário" a partir do token JWT do
// Supabase Auth enviado pelo front-end. Esse client RESPEITA as políticas de RLS.
function criarClienteDoUsuario(tokenJWT) {
  if (!supabaseUrl || !supabaseAnonKey) return null;

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${tokenJWT}` } }
  });
}

module.exports = {
  supabaseAdmin,
  criarClienteDoUsuario,
  supabaseUrl,
  supabaseAnonKey,
  supabaseServiceRoleKey
};
