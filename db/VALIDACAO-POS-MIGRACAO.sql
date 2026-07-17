-- =====================================================================
-- VALIDAÇÃO PÓS-MIGRAÇÃO: Verificar se as colunas foram adicionadas
-- 
-- Como usar:
-- 1. Vá em Supabase > SQL Editor
-- 2. Cole este arquivo inteiro
-- 3. Execute cada query (uma por vez) e verifique os resultados
-- =====================================================================

-- ✅ QUERY 1: Verificar que as 5 colunas existem
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'pedido_parcelas'
ORDER BY ordinal_position;

-- ESPERADO:
-- id, pedido_id, numero, valor, forma_pagamento, status, pago_em, 
-- boleto_codigo, boleto_linha_digitavel, boleto_vencimento, banco, nosso_numero, created_at

---

-- ✅ QUERY 2: Contar quantas colunas a tabela tem agora
SELECT COUNT(*) as total_colunas
FROM information_schema.columns
WHERE table_name = 'pedido_parcelas';

-- ESPERADO: 13 (ou mais, se houver outras colunas)

---

-- ✅ QUERY 3: Listar apenas as colunas de boleto
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'pedido_parcelas'
AND column_name LIKE 'boleto_%' OR column_name IN ('banco', 'nosso_numero')
ORDER BY column_name;

-- ESPERADO: Exactamente 5 linhas:
-- banco, boleto_codigo, boleto_linha_digitavel, boleto_vencimento, nosso_numero

---

-- ✅ QUERY 4: Se houver parcelas criadas, verificar que os campos são NULL ou têm dados
SELECT 
  id,
  numero,
  valor,
  boleto_codigo,
  boleto_linha_digitavel,
  boleto_vencimento,
  banco,
  nosso_numero
FROM public.pedido_parcelas
LIMIT 5;

-- ESPERADO: Parcelas existentes. Se boleto_* são NULL, é normal (precisam ser populados)

---

-- ✅ QUERY 5: Teste simples - Tentar inserir uma parcela com dados de boleto
-- (Descomente e adapte com um pedido_id válido para testar INSERT)
/*
INSERT INTO public.pedido_parcelas (
  pedido_id, numero, valor, forma_pagamento, status,
  boleto_codigo, boleto_linha_digitavel, boleto_vencimento, banco, nosso_numero
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000'::uuid,  -- Mude para um pedido_id válido
  1,
  150.00,
  'A prazo',
  'pendente',
  'BOL-12345678-01',
  '00112345678901234567890123456789012345678901',
  CURRENT_DATE + INTERVAL '30 days',
  '001',
  'NN1234567801'
);
*/

-- Se não der erro, migração foi bem-sucedida! ✅
