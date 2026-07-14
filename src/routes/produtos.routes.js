const express = require('express');
const { autenticar } = require('../middleware/auth');
const { supabaseAdmin } = require('../config/supabaseClient');

const router = express.Router();

// Vitrine pública de uma loja - usa a view sem quantidade_estoque
router.get('/loja/:lojaId/vitrine', async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(503).json({ erro: 'Supabase não configurado. Configure o projeto no .env.' });
  }

  const { data, error } = await supabaseAdmin
    .from('vw_vitrine_produtos')
    .select('*, produto_fotos(url, ordem)')
    .eq('loja_id', req.params.lojaId);

  if (error) return res.status(400).json({ erro: error.message });
  res.json(data);
});

// Cadastrar produto (dono da loja)
router.post('/', autenticar, async (req, res) => {
  const { loja_id, categoria_id, nome, descricao, preco, quantidade_estoque, fotos } = req.body;

  const { data: produto, error } = await req.supabase
    .from('produtos')
    .insert({ loja_id, categoria_id, nome, descricao, preco, quantidade_estoque })
    .select()
    .single();

  if (error) return res.status(400).json({ erro: error.message });

  if (fotos?.length) {
    const linhas = fotos.map((url, i) => ({ produto_id: produto.id, url, ordem: i }));
    await req.supabase.from('produto_fotos').insert(linhas);
  }

  res.status(201).json(produto);
});

// Listar produtos da loja COM estoque - só o dono (RLS cuida disso)
router.get('/loja/:lojaId/gerenciar', autenticar, async (req, res) => {
  const { data, error } = await req.supabase
    .from('produtos')
    .select('*, produto_fotos(url, ordem)')
    .eq('loja_id', req.params.lojaId);

  if (error) return res.status(400).json({ erro: error.message });
  res.json(data);
});

// Editar produto
router.put('/:id', autenticar, async (req, res) => {
  const { data, error } = await req.supabase
    .from('produtos')
    .update(req.body)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(400).json({ erro: error.message });
  res.json(data);
});

// Excluir produto
router.delete('/:id', autenticar, async (req, res) => {
  const { error } = await req.supabase.from('produtos').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ erro: error.message });
  res.status(204).send();
});

module.exports = router;
