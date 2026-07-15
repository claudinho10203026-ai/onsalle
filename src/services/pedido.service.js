function montarPayloadAtualizacaoStatus({ status, formaPagamento, parcelas }) {
  const payload = { status };

  if (status === 'concluido') {
    payload.forma_pagamento = formaPagamento || 'Dinheiro';
    if (parcelas) payload.parcelas = parcelas;
  }

  return payload;
}

module.exports = {
  montarPayloadAtualizacaoStatus
};
