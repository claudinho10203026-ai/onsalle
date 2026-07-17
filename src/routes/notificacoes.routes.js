const express = require('express');
const { autenticar } = require('../middleware/auth');

const router = express.Router();

// Salva a inscrição de push notification do navegador/dispositivo do usuário
// (o front-end chama isso depois que o usuário aceita receber notificações)
router.post('/inscrever', autenticar, async (req, res) => {
  const { endpoint, keys } = req.body.subscription;

  const { error } = await req.supabase.from('push_subscriptions').upsert(
    { usuario_id: req.usuario.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
    { onConflict: 'endpoint' }
  );

  if (error) return res.status(400).json({ erro: error.message });
  res.status(201).json({ ok: true });
});

module.exports = router;
