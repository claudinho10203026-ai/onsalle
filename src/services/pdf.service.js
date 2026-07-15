function escapePdfText(text) {
  return String(text ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function gerarPdfPagamento({ pedido, parcelas = [] }) {
  const linhas = [
    'Comprovante de pagamento',
    '',
    `Pedido: ${pedido?.id || '—'}`,
    `Cliente: ${pedido?.cliente_nome || '—'}`,
    `Telefone: ${pedido?.cliente_telefone || '—'}`,
    `Email: ${pedido?.cliente_email || '—'}`,
    `Forma de pagamento: ${pedido?.forma_pagamento || '—'}`,
    `Parcelas: ${pedido?.parcelas || parcelas.length || 1}`,
    `Total: R$ ${Number(pedido?.total || 0).toFixed(2)}`,
    `Status: ${pedido?.status === 'concluido' ? 'Pago' : 'Pendente'}`,
    `Criado em: ${pedido?.created_at || '—'}`,
    ''
  ];

  const linhasParcelas = (Array.isArray(parcelas) ? parcelas : []).length
    ? (Array.isArray(parcelas) ? parcelas : []).map((parcela) => {
        const numero = parcela?.numero || 1;
        const valor = Number(parcela?.valor || 0).toFixed(2);
        const status = parcela?.status === 'pago' ? 'Paga' : 'Pendente';
        const metodo = parcela?.forma_pagamento || 'Ainda não definida';
        const pagoEm = parcela?.pago_em ? new Date(parcela.pago_em).toLocaleString('pt-BR') : '—';
        return `Parcela ${numero}: R$ ${valor} | Status: ${status} | Método: ${metodo} | Baixa: ${pagoEm}`;
      })
    : [`Pagamento único: ${pedido?.forma_pagamento || '—'}`];

  const contentLines = [...linhas, ...linhasParcelas];
  const content = contentLines
    .map((line, index) => `BT /F1 11 Tf 50 ${760 - (index + 1) * 14} Td (${escapePdfText(line)}) Tj ET`)
    .join('\n');

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${Buffer.byteLength(content, 'utf8')} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
  ];

  let offset = 0;
  const offsets = [];
  const body = [];

  objects.forEach((obj, index) => {
    offsets.push(offset);
    body.push(`${index + 1} 0 obj\n${obj}\nendobj`);
    offset += Buffer.byteLength(body[body.length - 1], 'utf8');
  });

  const pdfHeader = '%PDF-1.4\n';
  const pdfBody = body.join('\n');
  const xrefPosition = Buffer.byteLength(pdfHeader + pdfBody, 'utf8');
  const xrefLines = ['xref', `0 ${objects.length + 1}`, '0000000000 65535 f '];

  offsets.forEach((value) => {
    xrefLines.push(String(value).padStart(10, '0') + ' 00000 n ');
  });

  return Buffer.concat([
    Buffer.from(pdfHeader, 'utf8'),
    Buffer.from(pdfBody, 'utf8'),
    Buffer.from(`\n${xrefLines.join('\n')}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPosition}\n%%EOF\n`, 'utf8')
  ]);
}

const gerarPdfParcelas = gerarPdfPagamento;

module.exports = {
  gerarPdfPagamento,
  gerarPdfParcelas
};
