function montarPayloadAtualizacaoStatus({ status, formaPagamento, parcelas }) {
  const payload = { status };

  if (status === 'concluido') {
    payload.forma_pagamento = formaPagamento || 'Dinheiro';
    if (parcelas) payload.parcelas = parcelas;
  }

  return payload;
}

function gerarDadosBoletoParcela({ pedidoId, numero, valor, diasPrazo = 30 }) {
  const vencimento = new Date();
  vencimento.setDate(vencimento.getDate() + diasPrazo * numero);
  const banco = '001';
  const idLimpo = String(pedidoId || '').replace(/[^0-9]/g, '').padEnd(10, '0').slice(0, 10);
  const valorCentavos = Math.round(Number(valor || 0) * 100).toString().padStart(10, '0');
  const linhaDigitavel = `${banco}${idLimpo}${String(numero).padStart(2, '0')}${valorCentavos}`.padEnd(47, '0');
  const nossoNumero = `NN${String(pedidoId || '').slice(0, 8)}${String(numero).padStart(2, '0')}`;

  return {
    boleto_codigo: `BOL-${String(pedidoId || '').slice(0, 8).toUpperCase()}-${String(numero).padStart(2, '0')}`,
    boleto_linha_digitavel: linhaDigitavel,
    boleto_vencimento: vencimento.toISOString().split('T')[0],
    banco,
    nosso_numero: nossoNumero
  };
}

module.exports = {
  montarPayloadAtualizacaoStatus,
  gerarDadosBoletoParcela
};
