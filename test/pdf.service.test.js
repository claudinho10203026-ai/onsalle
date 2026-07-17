const test = require('node:test');
const assert = require('node:assert/strict');

const { gerarPdfParcelas } = require('../src/services/pdf.service');

test('gera um buffer de PDF para as parcelas do pedido', () => {
  const buffer = gerarPdfParcelas({
    pedido: {
      id: 'pedido-1',
      cliente_nome: 'Ana',
      cliente_telefone: '11999999999',
      cliente_email: 'ana@email.com',
      forma_pagamento: 'A prazo',
      parcelas: 2,
      total: 100,
      created_at: '2024-01-01T00:00:00.000Z'
    },
    parcelas: [{ numero: 1, valor: 50, status: 'pago', forma_pagamento: 'Pix', pago_em: '2024-01-02T00:00:00.000Z' }]
  });

  assert.ok(Buffer.isBuffer(buffer));
  assert.match(buffer.toString('latin1'), /%PDF/);
});
