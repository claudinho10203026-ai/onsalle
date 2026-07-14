const express = require('express');
const { autenticar } = require('../middleware/auth');
const { supabaseAdmin } = require('../config/supabaseClient');

const router = express.Router();

// Contato exigido pela política de uso do Nominatim/OpenStreetMap no
// cabeçalho User-Agent. Troque pelo e-mail/domínio real do seu projeto.
const GEOCODER_USER_AGENT = 'VitrineLocal/1.0 (contato@vitrinelocal.exemplo.com)';

// ---------------------------------------------------------------------
// CEP -> endereço (ViaCEP) e endereço -> lat/lng (Nominatim/OpenStreetMap)
//
// O cadastro de loja exige um CEP real: ele é validado aqui no servidor
// contra o ViaCEP (nunca confiamos só no que o front-end mandou) e o
// endereço retornado é geocodificado para preencher latitude/longitude,
// que é o que a busca de "lojas próximas" (buscar_lojas_proximas) precisa
// para funcionar. Antes disso, latitude/longitude eram sempre enviados
// como null no cadastro, então nenhuma loja aparecia na busca por
// proximidade.
// ---------------------------------------------------------------------
async function resolverEnderecoPorCep(cepBruto) {
  const cep = String(cepBruto || '').replace(/\D/g, '');

  if (cep.length !== 8) {
    throw new Error('CEP inválido. Informe um CEP com 8 dígitos.');
  }

  let resposta;
  try {
    resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
  } catch (error) {
    throw new Error('Não foi possível validar o CEP agora. Tente novamente em instantes.');
  }

  if (!resposta.ok) {
    throw new Error('Não foi possível validar o CEP agora. Tente novamente em instantes.');
  }

  const dados = await resposta.json();
  if (dados.erro) {
    throw new Error('CEP não encontrado. Verifique o CEP informado.');
  }

  return {
    cep: dados.cep || cep,
    logradouro: dados.logradouro || '',
    bairro: dados.bairro || '',
    cidade: dados.localidade || '',
    estado: dados.uf || ''
  };
}

async function geocodificarEndereco({ logradouro, numero, bairro, cidade, estado, cep }) {
  const partes = [
    [logradouro, numero].filter(Boolean).join(', '),
    bairro,
    cidade && estado ? `${cidade} - ${estado}` : cidade || estado,
    cep,
    'Brasil'
  ].filter(Boolean);
  const query = partes.join(', ');

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(query)}`;
    const resposta = await fetch(url, { headers: { 'User-Agent': GEOCODER_USER_AGENT } });
    if (!resposta.ok) return { latitude: null, longitude: null };
    const resultados = await resposta.json();
    if (!Array.isArray(resultados) || !resultados.length) return { latitude: null, longitude: null };
    return {
      latitude: Number(resultados[0].lat),
      longitude: Number(resultados[0].lon)
    };
  } catch (error) {
    // Geocodificação é best-effort: se falhar, a loja ainda é criada,
    // só não aparece em "lojas próximas" até uma edição corrigir isso.
    console.warn('Falha ao geocodificar endereço da loja:', error.message);
    return { latitude: null, longitude: null };
  }
}

// Criar loja (é assim que um cliente "vira vendedor")
router.post('/', autenticar, async (req, res) => {
  const {
    nome,
    descricao,
    whatsapp,
    cep,
    numero,
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

  if (!cep) {
    return res.status(400).json({ erro: 'CEP é obrigatório para cadastrar a loja.' });
  }

  let enderecoResolvido;
  try {
    enderecoResolvido = await resolverEnderecoPorCep(cep);
  } catch (error) {
    return res.status(400).json({ erro: error.message });
  }

  const { latitude, longitude } = await geocodificarEndereco({
    logradouro: enderecoResolvido.logradouro,
    numero,
    bairro: enderecoResolvido.bairro,
    cidade: enderecoResolvido.cidade,
    estado: enderecoResolvido.estado,
    cep: enderecoResolvido.cep
  });

  const enderecoCompleto = [enderecoResolvido.logradouro, numero].filter(Boolean).join(', ');

  const { data, error } = await req.supabase
    .from('lojas')
    .insert({
      dono_id: req.usuario.id,
      nome,
      descricao,
      whatsapp,
      endereco: enderecoCompleto || null,
      cep: enderecoResolvido.cep,
      numero: numero || null,
      bairro: enderecoResolvido.bairro || null,
      cidade: enderecoResolvido.cidade || null,
      estado: enderecoResolvido.estado || null,
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

// Listar todas as lojas ativas (público) - é a listagem padrão da tela
// "Lojas", mostrada mesmo sem busca ou filtro de localização. Antes essa
// rota não existia: o front-end chamava fetch('/lojas') e recebia 404, por
// isso nenhuma loja aparecia por padrão nem no seletor da vitrine.
router.get('/', async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(503).json({ erro: 'Supabase não configurado. Configure o projeto no .env.' });
  }

  const { data, error } = await supabaseAdmin
    .from('lojas')
    .select('id, nome, descricao, endereco, whatsapp, logo_url, cover_url, cidade, estado, created_at')
    .eq('ativo', true)
    .order('created_at', { ascending: false });

  if (error) return res.status(400).json({ erro: error.message });
  res.json(data || []);
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

// Buscar lojas pelo nome da loja OU pelo nome de um produto que ela vende
// (público). GET /lojas/buscar?q=tenis
router.get('/buscar', async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(503).json({ erro: 'Supabase não configurado. Configure o projeto no .env.' });
  }

  const termo = String(req.query.q || '').trim();
  if (termo.length < 2) {
    return res.status(400).json({ erro: 'Digite ao menos 2 caracteres para buscar.' });
  }

  const { data, error } = await supabaseAdmin.rpc('buscar_lojas', { termo });
  if (error) return res.status(400).json({ erro: error.message });

  // A função no banco pode devolver a mesma loja duas vezes (uma por bater
  // no nome da loja, outra por bater no nome de um produto). Aqui juntamos
  // isso numa lista de lojas únicas, guardando os nomes de produtos que
  // combinaram para mostrar no front-end ("encontrado por: <produto>").
  const porLoja = new Map();
  for (const linha of data || []) {
    if (!porLoja.has(linha.id)) {
      porLoja.set(linha.id, { ...linha, produtos_correspondentes: [] });
    }
    const registro = porLoja.get(linha.id);
    if (linha.encontrado_por === 'produto' && linha.produto_nome) {
      registro.produtos_correspondentes.push(linha.produto_nome);
    }
  }

  res.json(Array.from(porLoja.values()));
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
  const payload = { ...req.body };

  // Se o dono está alterando o CEP, revalida e regeocodifica do mesmo jeito
  // que no cadastro, para manter latitude/longitude corretos na busca por
  // proximidade.
  if (payload.cep) {
    let enderecoResolvido;
    try {
      enderecoResolvido = await resolverEnderecoPorCep(payload.cep);
    } catch (error) {
      return res.status(400).json({ erro: error.message });
    }

    const { latitude, longitude } = await geocodificarEndereco({
      logradouro: enderecoResolvido.logradouro,
      numero: payload.numero,
      bairro: enderecoResolvido.bairro,
      cidade: enderecoResolvido.cidade,
      estado: enderecoResolvido.estado,
      cep: enderecoResolvido.cep
    });

    payload.cep = enderecoResolvido.cep;
    payload.bairro = enderecoResolvido.bairro || null;
    payload.cidade = enderecoResolvido.cidade || null;
    payload.estado = enderecoResolvido.estado || null;
    payload.endereco = [enderecoResolvido.logradouro, payload.numero].filter(Boolean).join(', ') || null;
    payload.latitude = latitude;
    payload.longitude = longitude;
  }

  const { data, error } = await req.supabase
    .from('lojas')
    .update(payload)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(400).json({ erro: error.message });
  res.json(data);
});

module.exports = router;