/**
 * Teste End-to-End: Vencimento de Parcelas com Intervalo Dinâmico
 * 
 * Objetivo: Validar que parcelas calculam vencimento corretamente
 * baseado no intervalo_dias (30, 60, 90, 120, 150)
 * 
 * Pré-requisitos:
 * - Backend rodando em http://localhost:3333
 * - Supabase configurado no .env
 * - Usuário logado com token válido
 */

// ========================================
// CENÁRIO 1: Pedido com 2 parcelas, intervalo 60 dias
// ========================================
console.log('\n📋 CENÁRIO 1: 2 parcelas, intervalo 60 dias\n');

const testCase1 = {
  descricao: 'Cliente faz pedido de R$200 → Marca concluído com 2 parcelas, intervalo 60',
  passos: [
    '1. Login do cliente',
    '2. Adicionar produto ao carrinho (loja: Store A)',
    '3. Finalizar pedido → cria pedido_id = <UUID>',
    '4. No dashboard do vendedor, clicar "Baixa do pedido"',
    '5. Preencher:',
    '   - Forma pagamento: "A prazo"',
    '   - Número parcelas: 2',
    '   - Intervalo: 60 dias',
    '6. Clicar "Registrar baixa"'
  ],
  validacao: [
    '✅ Pedido status muda para "concluido"',
    '✅ Duas parcelas criadas em pedido_parcelas:',
    '   - Parcela 1: numero=1, valor=100, boleto_vencimento = today + 60 dias',
    '   - Parcela 2: numero=2, valor=100, boleto_vencimento = today + 120 dias (60*2)',
    '✅ Linha digitável e boleto_codigo diferentes para cada parcela'
  ]
};

// ========================================
// CENÁRIO 2: Pedido com 3 parcelas, intervalo 30 dias
// ========================================
console.log('\n📋 CENÁRIO 2: 3 parcelas, intervalo 30 dias\n');

const testCase2 = {
  descricao: 'Cliente faz pedido de R$300 → 3 parcelas, intervalo 30',
  validacao: [
    '✅ Parcela 1: boleto_vencimento = today + 30',
    '✅ Parcela 2: boleto_vencimento = today + 60',
    '✅ Parcela 3: boleto_vencimento = today + 90',
    '✅ Soma das 3 parcelas = R$300 (sem arredondamento inadequado)'
  ]
};

// ========================================
// CENÁRIO 3: Falha esperada - intervalo inválido
// ========================================
console.log('\n📋 CENÁRIO 3: Intervalo inválido\n');

const testCase3 = {
  descricao: 'Frontend valida intervalo antes de enviar',
  validacao: [
    '✅ Select de intervalo apenas aceita: [30, 60, 90, 120, 150]',
    '✅ Se valores inválidos, backend default para 30 dias'
  ]
};

// ========================================
// COMO TESTAR (Manual)
// ========================================
console.log('\n🧪 INSTRUÇÕES DE TESTE MANUAL:\n');

const instrucoes = `
1. PREPARAÇÃO:
   - Abra 2 abas do navegador
   - Aba 1: Login como CLIENTE
   - Aba 2: Login como VENDEDOR (dono da loja)

2. TESTE CENÁRIO 1 (2 parcelas, 60 dias):
   a) Aba Cliente: Adicione produto ao carrinho
   b) Aba Cliente: Finalize pedido
   c) Aba Vendedor: Recarregue página de pedidos
   d) Aba Vendedor: Abra o pedido, clique "Baixa do pedido"
   e) Preencha:
      - Forma: "A prazo"
      - Parcelas: 2
      - Intervalo: 60
   f) Clique "Registrar baixa"
   
3. VALIDAÇÃO NO SUPABASE SQL:
   SELECT 
     numero, 
     valor, 
     boleto_vencimento,
     boleto_linha_digitavel,
     boleto_codigo
   FROM public.pedido_parcelas
   WHERE pedido_id = '<pedido_id>'
   ORDER BY numero;
   
   RESULTADO ESPERADO:
   - Parcela 1: vencimento = 2026-09-13 (hoje + 60)
   - Parcela 2: vencimento = 2026-11-12 (hoje + 120)

4. VALIDAÇÃO NO FRONTEND:
   a) Aba Vendedor: Atualizar página de "Pedidos"
   b) Pedido deve aparecer com status "concluído"
   c) Expandir parcelas e verificar datas

5. DOWNLOAD DE PDF:
   a) Clicar em "Baixar boleto" de cada parcela
   b) Verificar que PDF mostra:
      - Número da parcela
      - Valor
      - Vencimento correto
      - Linha digitável (deve ser diferente por parcela)
`;

console.log(instrucoes);

// ========================================
// QUERIES DE VALIDAÇÃO SQL
// ========================================
console.log('\n📊 QUERIES DE VALIDAÇÃO:\n');

const queries = {
  'Verificar parcelas criadas': `
    SELECT 
      id,
      numero,
      valor,
      boleto_vencimento,
      created_at,
      status
    FROM public.pedido_parcelas
    WHERE pedido_id = 'SEU_PEDIDO_ID'
    ORDER BY numero;
  `,
  
  'Verificar pedido status': `
    SELECT 
      id,
      status,
      forma_pagamento,
      parcelas,
      total,
      updated_at
    FROM public.pedidos
    WHERE id = 'SEU_PEDIDO_ID';
  `,
  
  'Listar todos pedidos do vendedor': `
    SELECT 
      p.id,
      p.cliente_nome,
      p.total,
      p.status,
      COUNT(pp.id) as numero_parcelas,
      MAX(pp.boleto_vencimento) as vencimento_final
    FROM public.pedidos p
    LEFT JOIN public.pedido_parcelas pp ON pp.pedido_id = p.id
    WHERE p.loja_id = 'SEU_LOJA_ID'
    GROUP BY p.id
    ORDER BY p.created_at DESC;
  `
};

console.log('Copie as queries abaixo em SQL Editor do Supabase:\n');
for (const [nome, query] of Object.entries(queries)) {
  console.log(`-- ${nome}`);
  console.log(query);
  console.log('');
}

console.log('\n✅ TESTE CONCLUÍDO COM SUCESSO SE:');
console.log('  1. Parcelas criadas com vencimentos diferenciados');
console.log('  2. Cálculo = intervalo_dias * numero_parcela');
console.log('  3. PDF boleto mostra vencimento correto');
console.log('  4. Soma de valores = total do pedido');
