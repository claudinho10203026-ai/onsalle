self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const title = data.titulo || 'Nova notificação';
  const body = data.corpo || '';
  event.waitUntil(self.registration.showNotification(title, { body }));
});
