const test = require('node:test');
const assert = require('node:assert/strict');

const { montarLinkWhatsapp } = require('../src/services/whatsapp.service');

test('monta link de WhatsApp com pedido e total', () => {
  const link = montarLinkWhatsapp({
    numeroLoja: '5511999999999',
    nomeCliente: 'Ana',
    itens: [{ nome_produto: 'Camiseta', quantidade: 2, preco_unitario: 20 }],
    total: 40,
    pedidoId: '123e4567-e89b-12d3-a456-426614174000'
  });

  assert.match(link, /wa\.me\/5511999999999/);
  assert.match(link, /Novo%20pedido/);
  assert.match(link, /Camiseta/);
});
