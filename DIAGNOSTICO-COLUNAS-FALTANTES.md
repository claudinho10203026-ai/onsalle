# 🔍 Diagnóstico: Colunas Faltantes em pedido_parcelas

## ⚠️ Problema Encontrado

```
Error: column "boleto_codigo" of relation "pedido_parcelas" does not exist
```

### Raiz do Problema
O banco de dados foi criado com uma versão anterior do schema que não incluía as colunas de boleto:
- `boleto_codigo`
- `boleto_linha_digitavel`
- `boleto_vencimento`
- `banco`
- `nosso_numero`

Mas o código backend **assume que essas colunas existem** e tenta:
1. ✏️ **INSERT** - Ao criar parcelas (pedidos.routes.js, linha 129)
2. 🔍 **SELECT** - Ao recuperar pedidos (pedidos.routes.js, múltiplas linhas)
3. 📄 **Ler dados** - Ao gerar PDF (pdf.service.js, linha 102)

---

## 📊 Arquivos Afetados

| Arquivo | Uso | Tipo | Status |
|---------|-----|------|--------|
| `src/routes/pedidos.routes.js` | INSERT dados boleto | Crítico | ❌ Falhando |
| `src/services/pdf.service.js` | LER dados boleto | Alto | ❌ Falhando |
| `src/services/pedido.service.js` | GERAR dados boleto | Médio | ✅ Funcionando |
| `db/schema.sql` | DEFINE colunas | Referência | ✅ Correto |
| `test/e2e-vencimento-parcelas.js` | Teste de dados | Teste | ❌ Não pode rodar |

---

## 🔧 Solução em 2 Passos

### PASSO 1: Adicionar Colunas ao Banco
**Arquivo:** `db/migrations/001_add_boleto_columns.sql` (já criado)

**Instruções:**
1. Abra Supabase > SQL Editor
2. Cole o conteúdo do arquivo `db/migrations/001_add_boleto_columns.sql`
3. Clique em "Run"
4. Verifique a mensagem de sucesso

**Script:**
```sql
alter table public.pedido_parcelas 
  add column if not exists boleto_codigo text;
alter table public.pedido_parcelas 
  add column if not exists boleto_linha_digitavel text;
alter table public.pedido_parcelas 
  add column if not exists boleto_vencimento date;
alter table public.pedido_parcelas 
  add column if not exists banco text;
alter table public.pedido_parcelas 
  add column if not exists nosso_numero text;
```

**Verificação:**
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'pedido_parcelas'
ORDER BY ordinal_position;
```

Esperado: Deve mostrar todas as 13 colunas incluindo as 5 novas.

---

### PASSO 2: Revisar Código Backend

#### Arquivo 1: `src/routes/pedidos.routes.js`
**Linhas afetadas:** 129 (INSERT)

**Status:** ✅ Código correto
- O código já está gerando os dados corretamente via `gerarDadosBoletoParcela()`
- Após adicionar as colunas, o INSERT funcionará

**Verificação:**
```javascript
// Linha 125-129: O insert já inclui os campos gerados
inserts.push({
  pedido_id: req.params.id,
  numero: i,
  valor,
  status: 'pendente',
  ...gerarDadosBoletoParcela({ pedidoId: req.params.id, numero: i, valor, diasPrazo: intervalo })
});
// gerarDadosBoletoParcela retorna: 
// { boleto_codigo, boleto_linha_digitavel, boleto_vencimento, banco, nosso_numero }
```

#### Arquivo 2: `src/services/pdf.service.js`
**Linhas afetadas:** 102-107 (LER dados)

**Status:** ✅ Código correto
- O código trata valores nulos com `|| '—'` (fallback)
- Após adicionar as colunas, funcionará normalmente

```javascript
const codigo = parcelaItem?.boleto_codigo || '—';
const linhaDigitavel = parcelaItem?.boleto_linha_digitavel || '—';
const vencimento = parcelaItem?.boleto_vencimento ? new Date(...).toLocaleDateString('pt-BR') : '—';
```

#### Arquivo 3: `src/services/pedido.service.js`
**Linhas afetadas:** 22 (GERAR dados)

**Status:** ✅ Código correto
- Função `gerarDadosBoletoParcela()` gera os 5 campos
- Sem dependência do banco

---

## ✅ Checklist de Correção

- [ ] **PASSO 1:** Execute `db/migrations/001_add_boleto_columns.sql` em Supabase
  
- [ ] **Verificação:** Execute query de verificação no SQL Editor
  
- [ ] **PASSO 2:** Teste criar um novo pedido com parcelas
  - Abra o app
  - Crie um pedido
  - Marque como "Concluído" com 2+ parcelas
  - Verifique se gera sem erro
  
- [ ] **PASSO 3:** Teste gerar PDF
  - Baixe PDF de uma parcela
  - Verifique se aparece os dados do boleto
  
- [ ] **PASSO 4:** Execute testes
  ```bash
  node --test test/automated-tests.js
  ```

---

## 🎯 Status Pós-Migração

Após executar `db/migrations/001_add_boleto_columns.sql`:

| Funcionalidade | Antes | Depois |
|---|---|---|
| Criar pedido com parcelas | ❌ Erro | ✅ Funciona |
| Listar pedidos com parcelas | ❌ Erro | ✅ Funciona |
| Gerar PDF de boleto | ❌ Erro | ✅ Funciona |
| Testes E2E | ❌ Bloqueado | ✅ Pode rodar |

---

## 📝 Notas Técnicas

### Por que isso aconteceu?
O schema.sql foi atualizado com novas colunas, mas o banco já existente não recebeu as alterações automaticamente. O `if not exists` no CREATE TABLE impede que ele rode novamente.

### Como evitar no futuro?
1. Use migrations versionadas (001_, 002_, etc.)
2. Execute migrations ANTES de fazer deploy do código que as usa
3. Teste em staging antes de produção

### Segurança
O script usa `if not exists`, então é seguro rodar múltiplas vezes - não causará erro se as colunas já existirem.
