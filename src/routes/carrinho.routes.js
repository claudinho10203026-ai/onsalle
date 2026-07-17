const express = require('express');
const { autenticar } = require('../middleware/auth');
const { supabaseAdmin } = require('../config/supabaseClient');

const router = express.Router();

// Pega (ou cria) o carrinho aberto do cliente logado para uma loja
//
// IMPORTANTE: antes esta rota fazia `carrinho_itens(*, produtos(nome, preco))`.
// A tabela `produtos` só é legível via RLS pelo DONO da loja (para esconder o
// estoque dos clientes) — então, quando um cliente que NÃO é dono abria o
// carrinho, o join com `produtos` voltava vazio/nulo e o front-end quebrava
// ao tentar ler `item.produtos.preco`. Era por isso que, ao compartilhar a
// vitrine, outras contas de cliente não conseguiam usar o carrinho.
// A correção: carrinho_itens agora guarda seu próprio snapshot
// (nome_produto, preco_unitario), então não precisamos mais desse join.
router.get('/loja/:lojaId', autenticar, async (req, res) => {
  let { data: carrinho } = await req.supabase
    .from('carrinhos')
    .select('*, carrinho_itens(*)')
    .eq('loja_id', req.params.lojaId)
    .eq('status', 'aberto')
    .maybeSingle();

  if (!carrinho) {
    const { data: novo, error } = await req.supabase
      .from('carrinhos')
      .insert({ cliente_id: req.usuario.id, loja_id: req.params.lojaId })
      .select('*, carrinho_itens(*)')
      .single();

    if (error) return res.status(400).json({ erro: error.message });
    carrinho = novo;
  }

  res.json(carrinho);
});

// Adiciona (ou atualiza a quantidade de) um item no carrinho.
//
// O cliente escolhe a quantidade livremente aqui — mesmo que seja maior do
// que o estoque disponível. Não bloqueamos nesse momento: o aviso de
// "estoque insuficiente, confirme com a loja no WhatsApp" só acontece ao
// finalizar o pedido (ver pedidos.routes.js).
//
// nome_produto e preco_unitario NUNCA vêm do corpo da requisição: são
// buscados no servidor via supabaseAdmin (a única forma de ler a tabela
// produtos sem esbarrar no RLS "só o dono vê"), para não permitir que um
// cliente malicioso mande um preço adulterado no POST.
router.post('/:carrinhoId/itens', autenticar, async (req, res) => {
  const produtoId = req.body.produto_id;
  const quantidade = Math.max(1, parseInt(req.body.quantidade, 10) || 1);

  if (!produtoId) {
    return res.status(400).json({ erro: 'produto_id é obrigatório' });
  }

  if (!supabaseAdmin) {
    return res.status(503).json({ erro: 'Supabase não configurado. Configure o projeto no .env.' });
  }

  const { data: produto, error: produtoError } = await supabaseAdmin
    .from('produtos')
    .select('id, nome, preco, ativo, loja_id')
    .eq('id', produtoId)
    .eq('ativo', true)
    .maybeSingle();

  if (produtoError) return res.status(400).json({ erro: produtoError.message });
  if (!produto) return res.status(404).json({ erro: 'Produto não encontrado ou indisponível.' });

  const { data, error } = await req.supabase
    .from('carrinho_itens')
    .upsert(
      {
        carrinho_id: req.params.carrinhoId,
        produto_id: produto.id,
        quantidade,
        preco_unitario: produto.preco,
        nome_produto: produto.nome
      },
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