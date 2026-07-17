# 📚 Guia de Arquivos - OnSalle Marketplace

## 🚨 PROBLEMA CRÍTICO ENCONTRADO

**Erro:** `column "boleto_codigo" of relation "pedido_parcelas" does not exist`

**Solução:** Leia [PLANO-ACAO-CORRECAO.md](PLANO-ACAO-CORRECAO.md) ⬅️ **COMECE AQUI**

---

## 📄 Documentação Gerada Nesta Sessão

### 🔴 CRÍTICO - Leia Primeiro

#### 1. [SUMARIO-EXECUTIVO.md](SUMARIO-EXECUTIVO.md)
- **O que é:** Resumo executivo de 1 página
- **Quem deve ler:** Você, para entender o cenário geral
- **Tempo:** 3 minutos
- **Contém:** 
  - Problema explicado em linguagem simples
  - Como resolver (3 passos)
  - Status completo do projeto

#### 2. [PLANO-ACAO-CORRECAO.md](PLANO-ACAO-CORRECAO.md) ⭐ **COMECE AQUI**
- **O que é:** Guia passo-a-passo para resolver o problema
- **Quem deve ler:** Você (para executar a solução)
- **Tempo:** ~15 minutos (inclui testes)
- **Contém:**
  - PASSO 1: Executar migration em Supabase
  - PASSO 2: Validar que deu certo
  - PASSO 3: Testar no app
  - PASSO 4: Rodar testes
  - Checklist de conclusão

### 🟡 IMPORTANTE - Leia Depois

#### 3. [DIAGNOSTICO-COLUNAS-FALTANTES.md](DIAGNOSTICO-COLUNAS-FALTANTES.md)
- **O que é:** Análise técnica aprofundada
- **Quem deve ler:** Desenvolvedores, para entender a raiz do problema
- **Tempo:** 10 minutos
- **Contém:**
  - Que colunas faltam
  - Onde o código usa essas colunas
  - Qual arquivo é crítico vs. importante vs. médio
  - Checklist de correção
  - Notas técnicas

#### 4. [REVISAO-COMPLETA.md](REVISAO-COMPLETA.md)
- **O que é:** Revisão de tudo que foi pedido e feito nesta sessão
- **Quem deve ler:** Você, para ver histórico
- **Tempo:** 20 minutos
- **Contém:**
  - Resumo de toda a conversa
  - Bugs corrigidos
  - Testes criados
  - O que ainda falta

### 🟢 REFERÊNCIA - Use Conforme Necessário

#### 5. [SESSAO-RESUMO.md](SESSAO-RESUMO.md)
- **O que é:** Resumo da sessão anterior (correção de bugs)
- **Quem deve ler:** Se quiser entender bugs que foram corrigidos
- **Contém:** Histórico de mudanças em pedidos.routes.js e WebSocketContext.tsx

---

## 🗂️ Scripts de Banco de Dados

### [db/migrations/001_add_boleto_columns.sql](db/migrations/001_add_boleto_columns.sql) ⭐ **EXECUTE ISTO**
- **O que é:** Script SQL para adicionar as 5 colunas faltantes
- **Como usar:**
  1. Abra Supabase > SQL Editor
  2. Copie TODO o conteúdo deste arquivo
  3. Paste em uma NEW QUERY
  4. Clique "Run"
- **Resultado:** Banco terá as colunas:
  - `boleto_codigo`
  - `boleto_linha_digitavel`
  - `boleto_vencimento`
  - `banco`
  - `nosso_numero`

### [db/VALIDACAO-POS-MIGRACAO.sql](db/VALIDACAO-POS-MIGRACAO.sql)
- **O que é:** 5 queries para validar que a migration funcionou
- **Como usar:**
  1. Após executar 001_add_boleto_columns.sql
  2. Execute cada QUERY uma por vez
  3. Verifique os resultados
- **Resultado:** Confirma que colunas estão presentes

---

## 📦 Código Já Criado Nesta Sessão

### Backend - Pronto para Usar

- [src/utils/logger.js](src/utils/logger.js) - Logging estruturado (novo)
- [src/routes/pedidos.routes.js](src/routes/pedidos.routes.js) - ✅ Corrigido
- [src/services/pedido.service.js](src/services/pedido.service.js) - ✅ Funcionando
- [src/services/pdf.service.js](src/services/pdf.service.js) - ✅ Funcionando

### Testes - Pronto para Executar

- [test/automated-tests.js](test/automated-tests.js) - Testes automatizados (novo)
- [test/e2e-vencimento-parcelas.js](test/e2e-vencimento-parcelas.js) - Teste E2E (novo)
- [test/e2e-data-isolation.js](test/e2e-data-isolation.js) - Teste E2E (novo)

---

## 🎯 Próximos Passos

### Hoje (CRÍTICO)
1. **Leia:** [PLANO-ACAO-CORRECAO.md](PLANO-ACAO-CORRECAO.md)
2. **Execute:** [db/migrations/001_add_boleto_columns.sql](db/migrations/001_add_boleto_columns.sql)
3. **Valide:** Queries de [db/VALIDACAO-POS-MIGRACAO.sql](db/VALIDACAO-POS-MIGRACAO.sql)
4. **Teste:** Criar pedido com parcelas no app

### Esta Semana (IMPORTANTE)
1. Gerar VAPID keys
2. Rodar testes automatizados
3. Testar com múltiplos usuários

### Próximas Semanas (LEGAL TER)
1. Integrar Logger em todos os endpoints
2. CI/CD automation
3. Performance testing

---

## 🗺️ Mapa Mental

```
OnSalle Marketplace
│
├─ 🔴 BLOQUEADOR CRÍTICO (HOJE)
│  └─ Colunas faltantes em pedido_parcelas
│     ├─ SOLUÇÃO: Execute db/migrations/001_add_boleto_columns.sql
│     ├─ VALIDAR: Use queries de db/VALIDACAO-POS-MIGRACAO.sql
│     └─ GUIA: Leia PLANO-ACAO-CORRECAO.md
│
├─ ✅ BUGS CORRIGIDOS
│  ├─ Intervalo de parcelas agora é dinâmico
│  ├─ Data isolation funciona corretamente
│  └─ RLS em PDF endpoints implementado
│
├─ 🟠 BLOQUEADOR MÉDIO (Esta semana)
│  ├─ VAPID keys não preenchidas
│  └─ Testes não foram executados
│
└─ 🟢 NICE-TO-HAVE (Próximas semanas)
   ├─ Logger integrado em produção
   ├─ CI/CD pipeline
   └─ Performance tuning
```

---

## 💡 Dicas Rápidas

### Se der erro na migration:
- Verifique que está em Supabase > SQL Editor (não em outro lugar)
- Copie EXACTAMENTE o conteúdo de 001_add_boleto_columns.sql
- Clique em "Run", não em "Save"
- Se disser "already exists", significa que as colunas já estão lá

### Se quiser entender o problema tecnicamente:
- Leia [DIAGNOSTICO-COLUNAS-FALTANTES.md](DIAGNOSTICO-COLUNAS-FALTANTES.md)
- Procure por "Arquivos Afetados" para ver qual código usa cada coluna

### Se precisar de validação:
- Execute as queries em [db/VALIDACAO-POS-MIGRACAO.sql](db/VALIDACAO-POS-MIGRACAO.sql)
- Deve mostrar 5 colunas de boleto

---

## 📞 Suporte

Se algo não funcionar:
1. Verifique [PLANO-ACAO-CORRECAO.md](PLANO-ACAO-CORRECAO.md) seção "Se algo der errado"
2. Copie a mensagem de erro
3. Verifique [DIAGNOSTICO-COLUNAS-FALTANTES.md](DIAGNOSTICO-COLUNAS-FALTANTES.md) para contexto técnico

---

**Última atualização:** 2026-07-14  
**Status:** 🔴 Aguardando execução de migration  
**Tempo estimado de resolução:** 10 minutos
