/**
 * Teste End-to-End: Data Isolation para Multi-Role Users
 * 
 * Objetivo: Garantir que um usuário com múltiplas roles (cliente + vendedor)
 * vê apenas os dados corretos em cada contexto
 * 
 * Bug que estávamos corrigindo:
 * - User A cria Store A
 * - User A compra de Store B (owned by User B)
 * - User A ativa vendor dashboard → ANTES: via pedidos de ambas as lojas
 *                                    DEPOIS: só via pedidos de Store A
 */

// ========================================
// SETUP: Criar usuários e lojas
// ========================================
console.log('\n🔐 SETUP INICIAL\n');

const setup = {
  usuarios: {
    userA: {
      email: 'alice@example.com',
      role: 'cliente + vendedor',
      lojas: ['Store A (Alice)'],
      compras: ['Store A (Alice)', 'Store B (Bob)'] // Alice compra de ambas
    },
    userB: {
      email: 'bob@example.com',
      role: 'vendedor',
      lojas: ['Store B (Bob)'],
      compras: []
    }
  }
};

// ========================================
// CENÁRIO: Multi-role isolation
// ========================================
console.log('\n📋 CENÁRIO: Alice (cliente + vendedor) - Data Isolation\n');

const testCase = {
  passos: [
    '1. Login como ALICE (alice@example.com)',
    '2. Crie uma loja "Store A" (agora Alice é vendedora)',
    '3. Logout e login como BOB (bob@example.com)',
    '4. Crie uma loja "Store B"',
    '5. Adicione um produto em "Store B"',
    '6. Logout e login como ALICE novamente',
    '7. Compre o produto de Store B (Bob\'s store)',
    '8. Na dashboard de ALICE:',
    '   a) Tela inicial: lista de vitrines (modo CLIENTE)',
    '   b) Clique em "Minhas lojas" (ativa vendor view)',
    '   c) Verificar: DEVE VER APENAS pedidos de Store A como VENDEDOR'
  ]
};

// ========================================
// VALIDAÇÕES ESPERADAS
// ========================================
console.log('\n✅ VALIDAÇÕES ESPERADAS:\n');

const validacoes = {
  'Modo Cliente (sem owner_view)': [
    '✓ GET /pedidos (sem ?owner_view)',
    '✓ Retorna APENAS pedidos onde cliente_id = alice_id',
    '✓ Pedido de alice comprando de Bob APARECER aqui (como cliente)',
    '✓ NÃO retorna pedidos de Store A (que Alice é dona)'
  ],
  
  'Modo Vendedor (com owner_view=true)': [
    '✓ GET /pedidos?owner_view=true',
    '✓ Backend busca todas lojas onde dono_id = alice_id',
    '✓ Retorna APENAS pedidos dessas lojas',
    '✓ Pedido de Alice comprando de Bob NÃO APARECE aqui',
    '✓ APENAS pedidos feitos PARA Store A aparecem'
  ],
  
  'Frontend switch correto': [
    '✓ Quando state.minhasLojas.length > 0, add ?owner_view=true',
    '✓ Dropdown mostra: "Ver como cliente" vs "Ver minhas lojas"',
    '✓ Trocar entre modos não mistura dados'
  ]
};

for (const [modo, checks] of Object.entries(validacoes)) {
  console.log(`${modo}:`);
  checks.forEach(c => console.log(`  ${c}`));
  console.log('');
}

// ========================================
// COMO TESTAR (Passo a Passo)
// ========================================
console.log('\n🧪 INSTRUÇÕES DE TESTE MANUAL:\n');

const instrucoes = `
IMPORTANTE: Use 2 NAVEGADORES (ou 2 abas anônimas diferentes) para evitar
conflitos de sessão.

NAVEGADOR 1: Alice
NAVEGADOR 2: Bob

---

PASSO 1: BOB cria Store B
  1. Abra navegador 2
  2. Vá para http://localhost:3333
  3. Login com bob@example.com (crie conta se necessário)
  4. Clique "Criar Loja"
  5. Nome: "Store B"
  6. Preencha dados (WhatsApp, etc)
  7. Salve loja_id = <STORE_B_ID>
  8. Crie 1 produto "Produto Test" por R$50

---

PASSO 2: ALICE cria Store A
  1. Abra navegador 1
  2. Vá para http://localhost:3333
  3. Login com alice@example.com (crie conta se necessário)
  4. Clique "Criar Loja"
  5. Nome: "Store A"
  6. Preencha dados
  7. Salve loja_id = <STORE_A_ID>
  8. Crie 1 produto "Produto Alice" por R$100

---

PASSO 3: ALICE compra de Store B (Bob)
  1. No navegador 1 (Alice):
  2. Procure por "Store B" na vitrine
  3. Abra Store B (de Bob)
  4. Adicione "Produto Test" ao carrinho
  5. Finalize pedido
  6. Nota: pedido_id = <ALICE_BUY_BOB_ID>

---

PASSO 4: Validar dados no Supabase
  1. Abra SQL Editor do Supabase
  2. Execute as queries abaixo com user IDs reais
  
  -- Query 1: Todos os pedidos de Alice como CLIENTE
  SELECT * FROM public.pedidos 
  WHERE cliente_id = '<alice_user_id>' 
  ORDER BY created_at DESC;
  
  RESULTADO ESPERADO:
  - 1 pedido: Alice comprando de Store B
  
  -- Query 2: Todos os pedidos de lojas de Alice como VENDEDOR
  SELECT pd.* FROM public.pedidos pd
  JOIN public.lojas l ON l.id = pd.loja_id
  WHERE l.dono_id = '<alice_user_id>'
  ORDER BY pd.created_at DESC;
  
  RESULTADO ESPERADO:
  - Nenhum ou 0 pedidos (a menos que Bob tenha comprado de Alice também)

---

PASSO 5: Testar no frontend
  1. No navegador 1 (Alice logada):
  2. Recarregue a página de "Pedidos"
  3. DEVE VER: 1 pedido de Alice comprando de Store B
  4. Clique em "Minhas Lojas" (vendor view)
  5. DEVE VER: Nenhum pedido (ou apenas se alguém comprou de Store A)
  6. Se clicar em "Store A":
     - APENAS pedidos recebidos em Store A aparecem
     - Pedido de Alice comprando de Store B NÃO aparece

---

PASSO 6: Teste de segurança (tentativa de bypass)
  1. No navegador 1 (Alice):
  2. Abra DevTools (F12 > Console)
  3. Tente buscar pedido de Bob manualmente:
  
  const { data, error } = await supabase
    .from('pedidos')
    .select('*')
    .eq('id', '<ALICE_BUY_BOB_ID>');  // ID do pedido de Alice em Store B
  
  RESULTADO ESPERADO:
  - data retorna o pedido (Alice é cliente, pode ver)
  - Isto é CORRETO
  
  4. Agora Alice tenta ver pedidos com owner_view=true:
  
  fetch('/pedidos?owner_view=true', {
    headers: { Authorization: 'Bearer ' + token }
  }).then(r => r.json()).then(console.log)
  
  RESULTADO ESPERADO:
  - Retorna APENAS pedidos de Store A (não de Store B)
  - Isto é CORRETO
`;

console.log(instrucoes);

console.log('\n✅ TESTE CONCLUÍDO COM SUCESSO SE:');
console.log('  1. Alice vê 1 pedido em modo cliente (compra de Bob)');
console.log('  2. Alice vê 0 pedidos em modo vendedor (nada vendido em Store A)');
console.log('  3. Filtros ?owner_view=true retornam dados corretos');
console.log('  4. Sem mistura de dados entre roles');
