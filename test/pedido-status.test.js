const test = require('node:test');
const assert = require('node:assert/strict');

const { montarPayloadAtualizacaoStatus } = require('../src/services/pedido.service');

test('monta payload com forma de pagamento para pedido concluído', () => {
  const payload = montarPayloadAtualizacaoStatus({
    status: 'concluido',
    formaPagamento: 'Pix'
  });

  assert.deepEqual(payload, {
    status: 'concluido',
    forma_pagamento: 'Pix'
  });
});

test('não inclui dados de baixa para status que não foi concluído', () => {
  const payload = montarPayloadAtualizacaoStatus({ status: 'pendente' });

  assert.deepEqual(payload, { status: 'pendente' });
});
