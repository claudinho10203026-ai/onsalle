-- =====================================================================
-- MIGRAÇÃO: Adicionar colunas de boleto à tabela pedido_parcelas
-- 
-- PROBLEMA: Código backend tenta usar colunas que não existem no banco
-- SOLUÇÃO: Adicionar as colunas se não existirem
--
-- Como executar:
-- 1. Vá em Supabase > SQL Editor
-- 2. Cole este arquivo inteiro
-- 3. Clique em "Run"
-- =====================================================================

-- Verificar e adicionar colunas uma por uma (seguro)
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

-- Verificação: Listar todas as colunas da tabela
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'pedido_parcelas'
ORDER BY ordinal_position;
