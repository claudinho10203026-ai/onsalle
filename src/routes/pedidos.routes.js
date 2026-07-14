const express = require('express');
const { autenticar } = require('../middleware/auth');
const { supabaseAdmin } = require('../config/supabaseClient');
const { montarLinkWhatsapp } = require('../services/whatsapp.service');
const { notificarUsuario } = require('../services/push.service');

const router = express.Router();

// Finaliza o pedido:
// 1) chama a função do banco (transação atômica: cria pedido, baixa estoque)
// 2) monta o link do WhatsApp já com a mensagem pronta
// 3) dispara a notificação push para o dono da loja
router.post('/finalizar', autenticar, async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(503).json({ erro: 'Supabase não configurado. Configure o projeto no .env.' });
  }

  const { carrinho_id } = req.body;

  const { data: pedidoId, error } = await req.supabase.rpc('finalizar_pedido', {
    p_carrinho_id: carrinho_id
  });

  if (error) return res.status(400).json({ erro: error.message });

  const { data: pedido } = await supabaseAdmin
    .from('pedidos')
    .select('*, pedido_itens(*), lojas(whatsapp, dono_id)')
    .eq('id', pedidoId)
    .single();

  const nomeCliente =
    req.usuario.user_metadata?.full_name || req.usuario.user_metadata?.name || req.usuario.email || 'Cliente';

  const linkWhatsapp = montarLinkWhatsapp({
    numeroLoja: pedido.lojas.whatsapp,
    nomeCliente,
    itens: pedido.pedido_itens,
    total: pedido.total,
    pedidoId: pedido.id
  });

  await notificarUsuario(supabaseAdmin, pedido.lojas.dono_id, {
    titulo: 'Novo pedido recebido! 🛍️',
    corpo: `Total: R$ ${Number(pedido.total).toFixed(2)}`,
    pedidoId: pedido.id
  });

  res.json({ pedido, linkWhatsapp });
});

// Lista pedidos - o próprio RLS decide se retorna os pedidos como cliente
// ou como dono de loja
router.get('/', autenticar, async (req, res) => {
  const { data, error } = await req.supabase
    .from('pedidos')
    .select('*, pedido_itens(*)')
    .order('created_at', { ascending: false });

  if (error) return res.status(400).json({ erro: error.message });
  res.json(data);
});

module.exports = router;
