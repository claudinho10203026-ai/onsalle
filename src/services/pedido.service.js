function montarPayloadAtualizacaoStatus({ status, formaPagamento }) {
  const payload = { status };

  if (status === 'concluido') {
    payload.forma_pagamento = formaPagamento || 'Dinheiro';
  }

  return payload;
}

module.exports = {
  montarPayloadAtualizacaoStatus
};
