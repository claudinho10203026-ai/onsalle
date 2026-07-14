const webpush = require('web-push');
require('dotenv').config();

const vapidSubject = process.env.VAPID_SUBJECT?.trim();
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY?.trim();
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY?.trim();

if (vapidSubject && vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

// Envia notificação push para todos os dispositivos inscritos de um usuário
// (ex.: o dono da loja, quando chega um pedido novo).
async function notificarUsuario(supabaseAdmin, usuarioId, payload) {
  if (!vapidSubject || !vapidPublicKey || !vapidPrivateKey) return;

  const { data: inscricoes, error } = await supabaseAdmin
    .from('push_subscriptions')
    .select('*')
    .eq('usuario_id', usuarioId);

  if (error || !inscricoes?.length) return;

  await Promise.all(
    inscricoes.map((inscricao) => {
      const subscription = {
        endpoint: inscricao.endpoint,
        keys: { p256dh: inscricao.p256dh, auth: inscricao.auth }
      };

      return webpush.sendNotification(subscription, JSON.stringify(payload)).catch(async (err) => {
        // Inscrição expirada/inválida (usuário desinstalou, trocou de navegador etc.)
        if (err.statusCode === 404 || err.statusCode === 410) {
          await supabaseAdmin.from('push_subscriptions').delete().eq('id', inscricao.id);
        }
      });
    })
  );
}

module.exports = { notificarUsuario };
