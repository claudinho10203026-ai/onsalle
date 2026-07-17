# 🔧 SOLUÇÃO - Erro de Policies Duplicadas

## 🔴 O Problema

Ao executar `schema.sql`, você recebeu:
```
ERROR: 42710: policy "pedido_parcelas_select" for table "pedido_parcelas" already exists
```

## 🔍 Causa Raiz

O arquivo `schema.sql` estava **faltando** os `drop policy if exists` para:
- `pedido_parcelas_select`
- `pedido_parcelas_update`
- `pedido_parcela_pagamentos_select`
- `pedido_parcela_pagamentos_insert`
- `pedido_parcela_pagamentos_update`

**Resultado:** Ao rodar schema.sql depois da migration, ele tentava criar policies que já existiam.

## ✅ Solução em 3 Passos

### PASSO 1: Limpar Policies Duplicadas
**Arquivo:** `db/fix-duplicate-policies.sql`

1. Abra Supabase > SQL Editor
2. Clique em "New Query"
3. Copie TODO conteúdo de `db/fix-duplicate-policies.sql`
4. Clique em "Run"

**Esperado:** Mensagem de sucesso, nenhuma policy deve ser listada

---

### PASSO 2: Verificar que o schema.sql foi Corrigido
**Status:** Já feito! ✅

O arquivo `db/schema.sql` foi atualizado com os drops que faltavam (linhas 600-607).

**Mudança feita:**
```sql
-- ANTES (apenas 3 drops):
drop policy if exists "pedidos_update_dono_loja" on public.pedidos;
drop policy if exists "pedido_itens_select" on public.pedido_itens;
drop policy if exists "push_subscriptions_gerencia_proprio" on public.push_subscriptions;

-- DEPOIS (agora com 8 drops - todas as policies):
drop policy if exists "pedidos_update_dono_loja" on public.pedidos;
drop policy if exists "pedido_itens_select" on public.pedido_itens;
drop policy if exists "pedido_parcelas_select" on public.pedido_parcelas;
drop policy if exists "pedido_parcelas_update" on public.pedido_parcelas;
drop policy if exists "pedido_parcela_pagamentos_select" on public.pedido_parcela_pagamentos;
drop policy if exists "pedido_parcela_pagamentos_insert" on public.pedido_parcela_pagamentos;
drop policy if exists "pedido_parcela_pagamentos_update" on public.pedido_parcela_pagamentos;
drop policy if exists "push_subscriptions_gerencia_proprio" on public.push_subscriptions;
```

---

### PASSO 3: (OPCIONAL) Reexecutar schema.sql
Se quiser recriar as policies corretamente:

1. Abra Supabase > SQL Editor
2. Clique em "New Query"
3. Copie TODO conteúdo de `db/schema.sql`
4. Clique em "Run"

**Esperado:** Nenhum erro de "already exists"

---

## 🎯 Resumo da Sequência Correta

Para que tudo funcione, execute NESTA ORDEM:

```
1. ✅ 001_add_boleto_columns.sql (já executado com sucesso)
   ↓
2. ✅ fix-duplicate-policies.sql (EXECUTE AGORA)
   ↓
3. ✅ schema.sql (se precisar recrear - OPCIONAL)
   ↓
4. ✅ VALIDACAO-POS-MIGRACAO.sql (rodar após)
```

---

## ✨ Resultado Final

Após PASSO 1 + PASSO 2:

| Operação | Antes | Depois |
|---|---|---|
| Executar schema.sql | ❌ Erro "already exists" | ✅ Sem erro |
| Policies de pedido_parcelas | ❌ Duplicadas | ✅ Limpas |
| Banco funcionando | ❌ Inconsistente | ✅ Consistente |

---

## 📋 Checklist

- [ ] **Executei** `db/fix-duplicate-policies.sql` em Supabase
- [ ] **Verifiquei** que não foram listadas policies (limpeza bem-sucedida)
- [ ] **Confirmei** que `db/schema.sql` foi atualizado (você está lendo isto)
- [ ] **Testei** criar um novo pedido com parcelas (agora deve funcionar!)

---

## 💡 Próximas Etapas

1. Execute `db/fix-duplicate-policies.sql`
2. Teste criar pedido novamente
3. Se tudo OK: proceda com testes E2E

---

**Status:** Pronto para execução ✅  
**Tempo:** ~2 minutos
