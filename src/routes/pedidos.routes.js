const express = require('express');
const { autenticar } = require('../middleware/auth');
const { supabaseAdmin } = require('../config/supabaseClient');
const { montarLinkWhatsapp } = require('../services/whatsapp.service');
const { notificarUsuario } = require('../services/push.service');
const { montarPayloadAtualizacaoStatus } = require('../services/pedido.service');
const { gerarPdfPagamento } = require('../services/pdf.service');

const router = express.Router();

// Finaliza o pedido:
// 1) chama a função do banco (transação atômica: cria pedido, baixa estoque
//    sem deixar ficar negativo, e marca quais itens excederam o estoque)
// 2) monta o link do WhatsApp já com a mensagem pronta
// 3) dispara a notificação push para o dono da loja
//
// ALTERADO: finalizar_pedido não bloqueia mais o pedido quando a
// quantidade escolhida é maior que o estoque — o pedido é criado do mesmo
// jeito e a função agora devolve um JSON com `itens_insuficientes`. Esse
// alerta é repassado no `itensInsuficientes` da resposta, para o front-end
// avisar o cliente a confirmar a disponibilidade com o dono da loja pelo
// WhatsApp.
router.post('/finalizar', autenticar, async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(503).json({ erro: 'Supabase não configurado. Configure o projeto no .env.' });
  }

  const { carrinho_id, forma_pagamento, parcelas } = req.body;

  const { data: resultado, error } = await req.supabase.rpc('finalizar_pedido', {
    p_carrinho_id: carrinho_id,
    p_forma_pagamento: forma_pagamento,
    p_parcelas: parcelas
  });

  if (error) return res.status(400).json({ erro: error.message });

  const pedidoId = resultado?.pedido_id;
  const itensInsuficientes = resultado?.itens_insuficientes || [];

  const { data: pedido } = await supabaseAdmin
    .from('pedidos')
    .select('*, pedido_itens(*), pedido_parcelas(*), lojas(whatsapp, dono_id)')
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

  res.json({ pedido, linkWhatsapp, itensInsuficientes });
});

router.patch('/:id/status', autenticar, async (req, res) => {
  const { status, forma_pagamento, pago_em, parcelas } = req.body;
  const validStatus = ['pendente', 'confirmado', 'concluido', 'cancelado'];
  if (!validStatus.includes(status)) {
    return res.status(400).json({ erro: 'Status de pedido inválido.' });
  }

  const payload = montarPayloadAtualizacaoStatus({
    status,
    formaPagamento: forma_pagamento,
    parcelas
  });

  const { data, error } = await req.supabase
    .from('pedidos')
    .update(payload)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(400).json({ erro: error.message });

  if (status === 'concluido') {
    // Se pagamento for a prazo e foi informada a quantidade de parcelas,
    // criamos as parcelas (somente se ainda não existirem) e não damos
    // baixa automática. Caso contrário, marcamos todas como pagas.
    if (forma_pagamento === 'A prazo' && parcelas && Number(parcelas) > 0) {
      const { data: existentes, error: errExistentes } = await req.supabase
        .from('pedido_parcelas')
        .select('*')
        .eq('pedido_id', req.params.id);

      if (errExistentes) return res.status(400).json({ erro: errExistentes.message });

      if (!existentes || existentes.length === 0) {
        const { data: pedidoRow, error: errPedido } = await supabaseAdmin
          .from('pedidos')
          .select('total')
          .eq('id', req.params.id)
          .single();

        if (errPedido) return res.status(400).json({ erro: errPedido.message });

        const total = Number(pedidoRow.total) || 0;
        const n = Number(parcelas);
        const base = Math.floor((total / n) * 100) / 100;
        let acc = 0;
        const inserts = [];
        for (let i = 1; i <= n; i++) {
          let valor = base;
          if (i === n) valor = +(total - acc).toFixed(2);
          else acc += base;
          inserts.push({
            pedido_id: req.params.id,
            parcela_num: i,
            valor,
            status: 'pendente'
          });
        }

        const { error: insertErr } = await supabaseAdmin.from('pedido_parcelas').insert(inserts);
        if (insertErr) return res.status(400).json({ erro: insertErr.message });
      }
    } else {
      const { error: errorParcelas } = await req.supabase
        .from('pedido_parcelas')
        .update({
          status: 'pago',
          forma_pagamento: payload.forma_pagamento || null,
          pago_em: pago_em ? new Date(pago_em).toISOString() : new Date().toISOString()
        })
        .eq('pedido_id', req.params.id);

      if (errorParcelas) {
        return res.status(400).json({ erro: `Pedido atualizado, mas não foi possível registrar a baixa das parcelas: ${errorParcelas.message}` });
      }
    }
  }

  res.json(data);
});

router.patch('/:id/parcela/:parcelaId', autenticar, async (req, res) => {
  const { status, forma_pagamento, pago_em } = req.body;
  const validStatus = ['pendente', 'pago'];
  if (!validStatus.includes(status)) {
    return res.status(400).json({ erro: 'Status da parcela inválido.' });
  }

  const payload = {
    status,
    forma_pagamento: forma_pagamento || null,
    pago_em: status === 'pago' ? (pago_em ? new Date(pago_em).toISOString() : new Date().toISOString()) : null
  };

  const { data, error } = await req.supabase
    .from('pedido_parcelas')
    .update(payload)
    .eq('id', req.params.parcelaId)
    .eq('pedido_id', req.params.id)
    .select()
    .single();

  if (error) return res.status(400).json({ erro: error.message });
  res.json(data);
});

// Lista pedidos - o próprio RLS decide se retorna os pedidos como cliente
// ou como dono de loja
router.get('/', autenticar, async (req, res) => {
  const ownerView = req.query.owner_view === 'true';

  if (ownerView) {
    const { data: lojas, error: lojasErr } = await supabaseAdmin
      .from('lojas')
      .select('id')
      .eq('dono_id', req.usuario.id);

    if (lojasErr) return res.status(400).json({ erro: lojasErr.message });

    const lojaIds = (lojas || []).map(l => l.id);
    if (lojaIds.length === 0) return res.json([]);

    const { data, error } = await supabaseAdmin
      .from('pedidos')
      .select('*, pedido_itens(*), pedido_parcelas(*)')
      .in('loja_id', lojaIds)
      .order('created_at', { ascending: false });

    if (error) return res.status(400).json({ erro: error.message });
    return res.json(data);
  }

  const { data, error } = await req.supabase
    .from('pedidos')
    .select('*, pedido_itens(*), pedido_parcelas(*)')
    .order('created_at', { ascending: false });

  if (error) return res.status(400).json({ erro: error.message });
  res.json(data);
});

router.get('/:id/pdf-pagamento', autenticar, async (req, res) => {
  const { data: pedido, error: errorPedido } = await req.supabase
    .from('pedidos')
    .select('*, pedido_parcelas(*)')
    .eq('id', req.params.id)
    .single();

  if (errorPedido || !pedido) {
    return res.status(404).json({ erro: 'Pedido não encontrado.' });
  }

  const parcelas = Array.isArray(pedido.pedido_parcelas) ? pedido.pedido_parcelas : [];
  if (!pedido.status || pedido.status !== 'concluido') {
    return res.status(400).json({ erro: 'Só é possível baixar o comprovante de pedidos já pagos.' });
  }

  const pdfBuffer = gerarPdfPagamento({ pedido, parcelas });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="pagamento-${pedido.id}.pdf"`);
  res.send(pdfBuffer);
});

router.get('/:id/pdf-parcelas', autenticar, async (req, res) => {
  const { data: pedido, error: errorPedido } = await req.supabase
    .from('pedidos')
    .select('*, pedido_parcelas(*)')
    .eq('id', req.params.id)
    .single();

  if (errorPedido || !pedido) {
    return res.status(404).json({ erro: 'Pedido não encontrado.' });
  }

  if (!pedido.status || pedido.status !== 'concluido') {
    return res.status(400).json({ erro: 'Só é possível baixar o comprovante de pedidos já pagos.' });
  }

  const parcelas = Array.isArray(pedido.pedido_parcelas) ? pedido.pedido_parcelas : [];
  const pdfBuffer = gerarPdfPagamento({ pedido, parcelas });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="parcelas-${pedido.id}.pdf"`);
  res.send(pdfBuffer);
});

module.exports = router;