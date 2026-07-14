const express = require('express');
const { autenticar } = require('../middleware/auth');
const { supabaseAdmin } = require('../config/supabaseClient');

const router = express.Router();
const BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET || 'vitrine';

// Vitrine pública de uma loja - usa a view sem quantidade_estoque
router.get('/loja/:lojaId/vitrine', async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(503).json({ erro: 'Supabase não configurado. Configure o projeto no .env.' });
  }

  const { data, error } = await supabaseAdmin
    .from('vw_vitrine_produtos')
    .select('*, produto_fotos(url, ordem)')
    .eq('loja_id', req.params.lojaId);

  if (error) return res.status(400).json({ erro: error.message });
  res.json(data);
});

// Upload real de foto para o Supabase Storage
router.get('/upload-foto', (req, res) => {
  res.status(405).json({ erro: 'Use POST para enviar a imagem.' });
});

router.post('/upload-foto', autenticar, async (req, res) => {
  const { fileName, contentType, dataUrl } = req.body;

  if (!dataUrl || !fileName) {
    return res.status(400).json({ erro: 'fileName e dataUrl são obrigatórios' });
  }

  if (!supabaseAdmin) {
    return res.status(503).json({ erro: 'Supabase Storage não configurado. Defina as credenciais de service role no .env.' });
  }

  try {
    const matches = dataUrl.match(/^data:(.+);base64,(.+)$/);
    if (!matches) throw new Error('Data URL inválida');

    const buffer = Buffer.from(matches[2], 'base64');
    const safeName = String(fileName)
      .normalize('NFD')
      .replace(/[^\w.-]/g, '-')
      .replace(/-+/g, '-')
      .toLowerCase();
    const pathName = `${Date.now()}-${safeName}`;

    let uploadResult = await supabaseAdmin.storage.from(BUCKET_NAME).upload(pathName, buffer, {
      contentType: contentType || 'image/jpeg',
      upsert: true
    });

    if (uploadResult.error && /not found|bucket/i.test(uploadResult.error.message || '')) {
      await supabaseAdmin.storage.createBucket(BUCKET_NAME, { public: true });
      uploadResult = await supabaseAdmin.storage.from(BUCKET_NAME).upload(pathName, buffer, {
        contentType: contentType || 'image/jpeg',
        upsert: true
      });
    }

    if (uploadResult.error) {
      return res.status(400).json({ erro: uploadResult.error.message });
    }

    const { data: publicUrlData } = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(pathName);
    return res.json({ url: publicUrlData.publicUrl });
  } catch (error) {
    return res.status(400).json({ erro: error.message || 'Falha ao enviar a imagem' });
  }
});

// Cadastrar produto (dono da loja)
router.post('/', autenticar, async (req, res) => {
  const { loja_id, categoria_id, nome, descricao, preco, quantidade_estoque, fotos, destaque } = req.body;

  const { data: produto, error } = await req.supabase
    .from('produtos')
    .insert({ loja_id, categoria_id, nome, descricao, preco, quantidade_estoque, destaque: Boolean(destaque) })
    .select()
    .single();

  if (error) return res.status(400).json({ erro: error.message });

  if (fotos?.length) {
    const linhas = fotos.map((url, i) => ({ produto_id: produto.id, url, ordem: i }));
    await req.supabase.from('produto_fotos').insert(linhas);
  }

  res.status(201).json(produto);
});

// Listar produtos da loja COM estoque - só o dono (RLS cuida disso)
router.get('/loja/:lojaId/gerenciar', autenticar, async (req, res) => {
  const { data, error } = await req.supabase
    .from('produtos')
    .select('*, produto_fotos(url, ordem)')
    .eq('loja_id', req.params.lojaId);

  if (error) return res.status(400).json({ erro: error.message });
  res.json(data);
});

// Editar produto
router.put('/:id', autenticar, async (req, res) => {
  const { fotos, ...atualizacao } = req.body;

  const { data: produtoAtualizado, error: errorProduto } = await req.supabase
    .from('produtos')
    .update(atualizacao)
    .eq('id', req.params.id)
    .select()
    .single();

  if (errorProduto) return res.status(400).json({ erro: errorProduto.message });

  if (Array.isArray(fotos)) {
    // Substitui as fotos atuais pela nova lista enviada pelo cliente.
    const { error: deleteError } = await req.supabase
      .from('produto_fotos')
      .delete()
      .eq('produto_id', req.params.id);

    if (deleteError) return res.status(400).json({ erro: deleteError.message });

    if (fotos.length) {
      const linhas = fotos.map((url, i) => ({ produto_id: req.params.id, url, ordem: i }));
      const { error: insertError } = await req.supabase.from('produto_fotos').insert(linhas);
      if (insertError) return res.status(400).json({ erro: insertError.message });
    }
  }

  res.json(produtoAtualizado);
});

// Excluir produto
router.delete('/:id', autenticar, async (req, res) => {
  const { error } = await req.supabase.from('produtos').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ erro: error.message });
  res.status(204).send();
});

module.exports = router;
