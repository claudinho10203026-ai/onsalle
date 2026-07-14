const express = require('express');
const { autenticar } = require('../middleware/auth');

const router = express.Router();

// Pega (ou cria) o carrinho aberto do cliente logado para uma loja
router.get('/loja/:lojaId', autenticar, async (req, res) => {
  let { data: carrinho } = await req.supabase
    .from('carrinhos')
    .select('*, carrinho_itens(*, produtos(nome, preco))')
    .eq('loja_id', req.params.lojaId)
    .eq('status', 'aberto')
    .maybeSingle();

  if (!carrinho) {
    const { data: novo, error } = await req.supabase
      .from('carrinhos')
      .insert({ cliente_id: req.usuario.id, loja_id: req.params.lojaId })
      .select('*, carrinho_itens(*, produtos(nome, preco))')
      .single();

    if (error) return res.status(400).json({ erro: error.message });
    carrinho = novo;
  }

  res.json(carrinho);
});

// Adiciona ou atualiza a quantidade de um item no carrinho
router.post('/:carrinhoId/itens', autenticar, async (req, res) => {
  const { produto_id, quantidade, preco_unitario } = req.body;

  const { data, error } = await req.supabase
    .from('carrinho_itens')
    .upsert(
      { carrinho_id: req.params.carrinhoId, produto_id, quantidade, preco_unitario },
      { onConflict: 'carrinho_id,produto_id' }
    )
    .select()
    .single();

  if (error) return res.status(400).json({ erro: error.message });
  res.json(data);
});

// Remove um item do carrinho
router.delete('/:carrinhoId/itens/:produtoId', autenticar, async (req, res) => {
  const { error } = await req.supabase
    .from('carrinho_itens')
    .delete()
    .eq('carrinho_id', req.params.carrinhoId)
    .eq('produto_id', req.params.produtoId);

  if (error) return res.status(400).json({ erro: error.message });
  res.status(204).send();
});

module.exports = router;
