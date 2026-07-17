-- =====================================================================
-- SOLUÇÃO: Remover policies duplicadas de pedido_parcelas e pedido_parcela_pagamentos
-- 
-- O problema: schema.sql não tem drop policy if exists para essas policies
-- Resultado: Ao rodar schema.sql após a migration, as policies duplicam
--
-- Como executar:
-- 1. Vá em Supabase > SQL Editor
-- 2. Cole este arquivo inteiro
-- 3. Clique em "Run"
-- =====================================================================

-- Remover policies duplicadas de pedido_parcelas
drop policy if exists "pedido_parcelas_select" on public.pedido_parcelas;
drop policy if exists "pedido_parcelas_update" on public.pedido_parcelas;

-- Remover policies duplicadas de pedido_parcela_pagamentos
drop policy if exists "pedido_parcela_pagamentos_select" on public.pedido_parcela_pagamentos;
drop policy if exists "pedido_parcela_pagamentos_insert" on public.pedido_parcela_pagamentos;
drop policy if exists "pedido_parcela_pagamentos_update" on public.pedido_parcela_pagamentos;

-- Verificação: Listar todas as policies de pedido_parcelas
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename IN ('pedido_parcelas', 'pedido_parcela_pagamentos')
ORDER BY tablename, policyname;

-- ESPERADO: Agora deve estar vazio (policies removidas com sucesso)
