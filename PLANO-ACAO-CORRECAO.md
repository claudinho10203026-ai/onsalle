# 🚀 Plano de Ação - Correção de Colunas Faltantes

## 📋 Resumo do Problema

O banco de dados não tem as 5 colunas de boleto que o backend precisa:
- `boleto_codigo`
- `boleto_linha_digitavel`
- `boleto_vencimento`
- `banco`
- `nosso_numero`

**Resultado:** Toda operação que tenta criar/ler pedidos com parcelas falha com:
```
Error: column "boleto_codigo" of relation "pedido_parcelas" does not exist
```

---

## 🔧 PASSO-A-PASSO DE CORREÇÃO

### PASSO 1: Adicionar as Colunas ao Banco de Dados
**⏱️ Tempo: 2 minutos**

1. Abra seu painel **Supabase** (https://app.supabase.com)
2. Selecione seu projeto
3. Vá em **SQL Editor** (lado esquerdo)
4. Clique em **New Query**
5. Copie e cole TODO o conteúdo de `db/migrations/001_add_boleto_columns.sql`
6. Clique em **Run** (ou `Ctrl+Enter`)
7. Você deve ver uma mensagem de sucesso:
   ```
   Queries executed successfully
   ```

**O que está acontecendo:**
- O script adiciona as 5 colunas IF NOT EXISTS
- Isso significa: se já existirem, ignora; se não existirem, adiciona
- É seguro rodar múltiplas vezes

**Possíveis mensagens:**
- ✅ `Queries executed successfully` → SUCESSO! Continue para PASSO 2.
- ❌ `column "boleto_codigo" already exists` → As colunas já existem! Vá para PASSO 3.
- ❌ Outro erro → Copie o erro e anexe em um comentário.

---

### PASSO 2: Validar que as Colunas Foram Adicionadas
**⏱️ Tempo: 1 minuto**

Ainda em **SQL Editor > New Query**:

1. Copie e cole a **QUERY 1** de `db/VALIDACAO-POS-MIGRACAO.sql`
2. Clique em **Run**
3. Você deve ver uma tabela com todas as colunas, incluindo:
   - `boleto_codigo | text | true`
   - `boleto_linha_digitavel | text | true`
   - `boleto_vencimento | date | true`
   - `banco | text | true`
   - `nosso_numero | text | true`

**Se vir:** ✅ Perfeito! Continue para PASSO 3.
**Se não vir:** ❌ Volte para PASSO 1 e verifique a mensagem de erro.

---

### PASSO 3: Testar se o Backend Funciona
**⏱️ Tempo: 5 minutos**

#### 3.1 Iniciar o servidor

1. Abra um terminal em `c:\Users\Suporte\onsalle`
2. Rode:
   ```bash
   npm start
   ```
3. Você deve ver:
   ```
   Servidor rodando na porta 3333
   ```

**Se der erro:**
- Verifique se `.env` tem as credenciais do Supabase
- Verifique se `npm install` foi executado antes

#### 3.2 Testar criação de pedido no app

1. Abra a aplicação web em `http://localhost:3333`
2. Faça login
3. Navegue até uma loja
4. Adicione um produto ao carrinho
5. Vá para checkout
6. Finalize o pedido
7. Na tela de "Meus Pedidos":
   - Clique em um pedido que acabou de criar
   - Vá para "Vendedor Dashboard" (se você tem uma loja)
   - Clique em status do pedido e marque como **"Concluído"**
   - Forme de pagamento: **"A prazo"**
   - Parcelas: **"2"**
   - Intervalo: **"60 dias"** (ou outro valor)
   - Clique em **Confirmar**

**Esperado:**
- ✅ Nenhum erro no console
- ✅ Pedido marcado como "Concluído"
- ✅ Parcelas criadas e visíveis na tabela

**Se der erro:**
- Copie a mensagem de erro
- Verifique o console do backend (terminal)
- Anexe o erro em um comentário

#### 3.3 Testar geração de PDF

1. Na tela do pedido, clique em **"Baixar Boleto"** ou **"PDF de Parcelas"**
2. O PDF deve ser gerado e baixado

**Esperado:**
- ✅ PDF gerado com sucesso
- ✅ Mostra os dados do boleto (código, linha digitável, etc.)

**Se der erro:**
- Verifique se as colunas foram realmente adicionadas (PASSO 2)
- Copie o erro e annexe em um comentário

---

### PASSO 4: Rodar Testes Automatizados (Opcional mas Recomendado)
**⏱️ Tempo: 2 minutos**

1. Abra um novo terminal (deixe o outro rodando)
2. Em `c:\Users\Suporte\onsalle`, rode:
   ```bash
   node --test test/automated-tests.js
   ```

3. Você verá:
   ```
   ✓ Suite 1: Cálculo de vencimento
   ✓ Suite 2: Validação de intervalo
   ✓ Suite 3: Autorização (RLS)
   ✓ Suite 4: Data Isolation
   
   Tests: 15 passed
   ```

**Se tudo passar:** ✅ Migração foi bem-sucedida!
**Se algum falhar:** ❌ Verifique a mensagem de erro (pode ser esperado se a DB vazia)

---

## 📊 Checklist de Conclusão

- [ ] **PASSO 1:** Executei migration script em Supabase SQL Editor
- [ ] **PASSO 2:** Validei que as 5 colunas foram adicionadas
- [ ] **PASSO 3a:** Servidor está rodando em `localhost:3333`
- [ ] **PASSO 3b:** Criei um pedido e marquei como "Concluído" com parcelas
- [ ] **PASSO 3c:** Consegui baixar PDF de boleto sem erro
- [ ] **PASSO 4:** Rodei testes automatizados (opcional)

---

## 🎯 Resultado Final

Após completar todos os passos:

| Funcionalidade | Status |
|---|---|
| ✅ Criar pedidos com parcelas | Funcionando |
| ✅ Listar pedidos com parcelas | Funcionando |
| ✅ Gerar PDF de boleto | Funcionando |
| ✅ Testes E2E | Podem rodar |
| ✅ Testes Automatizados | Passando |

---

## 💡 Se algo der errado

1. **Erro durante migration:** 
   - Volte para PASSO 1
   - Copie exatamente o conteúdo de `db/migrations/001_add_boleto_columns.sql`
   - Paste em uma NEW QUERY no SQL Editor

2. **Erro ao criar pedido:**
   - Verifique se `.env` tem as credenciais
   - Verifique se as colunas foram adicionadas (PASSO 2)
   - Verifique logs no terminal do backend

3. **Erro ao gerar PDF:**
   - Verifique se pedido tem parcelas criadas em Supabase
   - Verifique se `boleto_codigo` não é NULL nas parcelas

4. **Testes falhando:**
   - Se for erro de conexão com DB: verifique `.env`
   - Se for erro de lógica: pode ser esperado se DB vazia

---

## 📞 Próximos Passos Após Sucesso

Uma vez que essa migração estiver funcionando:

1. **Integrar Logger** em `src/routes/pedidos.routes.js`
2. **Gerar VAPID keys** para push notifications
3. **Executar testes E2E** com múltiplos usuários
4. **Deploy para produção** após validação completa

---

**Última atualização:** 2026-07-14
**Status:** 🔴 BLOQUEADOR - Aguardando execução de migration pelo user
