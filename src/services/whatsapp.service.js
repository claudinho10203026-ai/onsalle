// Monta o link "wa.me" com a mensagem do pedido já preenchida.
// O cliente final é quem aperta "Enviar" dentro do WhatsApp - esse fluxo
// é gratuito e não exige aprovação de nenhuma Business API.
function montarLinkWhatsapp({ numeroLoja, nomeCliente, itens, total, pedidoId }) {
  const linhas = [
    `*Novo pedido #${pedidoId.slice(0, 8)}*`,
    `Cliente: ${nomeCliente}`,
    '',
    ...itens.map(
      (i) => `${i.quantidade}x ${i.nome_produto} - R$ ${(i.preco_unitario * i.quantidade).toFixed(2)}`
    ),
    '',
    `*Total: R$ ${Number(total).toFixed(2)}*`
  ];

  const mensagem = encodeURIComponent(linhas.join('\n'));
  const numero = numeroLoja.replace(/\D/g, ''); // só dígitos, formato internacional: 5581999999999

  return `https://wa.me/${numero}?text=${mensagem}`;
}

module.exports = { montarLinkWhatsapp };
