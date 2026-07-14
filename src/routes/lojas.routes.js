const express = require('express');
const { autenticar } = require('../middleware/auth');
const { supabaseAdmin } = require('../config/supabaseClient');

const router = express.Router();

// Criar loja (é assim que um cliente "vira vendedor")
router.post('/', autenticar, async (req, res) => {
  const {
    nome,
    descricao,
    whatsapp,
    endereco,
    latitude,
    longitude,
    documento,
    tipo_documento,
    logo_url,
    cover_url,
    primary_color,
    secondary_color,
    accent_color,
    hero_title,
    hero_subtitle
  } = req.body;

  if (!nome || !whatsapp) {
    return res.status(400).json({ erro: 'nome e whatsapp são obrigatórios' });
  }

  const { data, error } = await req.supabase
    .from('lojas')
    .insert({
      dono_id: req.usuario.id,
      nome,
      descricao,
      whatsapp,
      endereco,
      latitude,
      longitude,
      documento,
      tipo_documento: tipo_documento || 'cpf',
      logo_url,
      cover_url,
      primary_color,
      secondary_color,
      accent_color,
      hero_title,
      hero_subtitle
    })
    .select()
    .single();

  if (error) return res.status(400).json({ erro: error.message });
  res.status(201).json(data);
});

// Listar lojas do usuário autenticado
router.get('/minhas', autenticar, async (req, res) => {
  const { data, error } = await req.supabase
    .from('lojas')
    .select('*')
    .eq('dono_id', req.usuario.id)
    .order('created_at', { ascending: false });

  if (error) return res.status(400).json({ erro: error.message });
  res.json(data || []);
});

// Listar lojas próximas de uma coordenada (público)
// GET /lojas/proximas?lat=-8.28&lng=-35.97&raio_km=15
router.get('/proximas', async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(503).json({ erro: 'Supabase não configurado. Configure o projeto no .env.' });
  }

  const { lat, lng, raio_km } = req.query;

  if (!lat || !lng) return res.status(400).json({ erro: 'lat e lng são obrigatórios' });

  const { data, error } = await supabaseAdmin.rpc('buscar_lojas_proximas', {
    lat: Number(lat),
    lng: Number(lng),
    raio_km: raio_km ? Number(raio_km) : 10
  });

  if (error) return res.status(400).json({ erro: error.message });
  res.json(data);
});

// Detalhe de uma loja (público)
router.get('/:id', async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(503).json({ erro: 'Supabase não configurado. Configure o projeto no .env.' });
  }

  const { data, error } = await supabaseAdmin
    .from('lojas')
    .select('*')
    .eq('id', req.params.id)
    .eq('ativo', true)
    .single();

  if (error) return res.status(404).json({ erro: 'Loja não encontrada' });
  res.json(data);
});

// Editar loja (só o dono - garantido pelo RLS)
router.put('/:id', autenticar, async (req, res) => {
  const { data, error } = await req.supabase
    .from('lojas')
    .update(req.body)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(400).json({ erro: error.message });
  res.json(data);
});

module.exports = router;
