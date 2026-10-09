// Desinstala o service worker de quando o app esteve publicado neste endereço. Ele continuava
// no navegador de quem visitou e respondia às páginas do site (como Privacidade) com a tela do app.
// O navegador baixa este arquivo no lugar do antigo: ele apaga o cache, se desinstala e recarrega as abas.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) await caches.delete(k);
  await self.registration.unregister();
  for (const c of await self.clients.matchAll({ type: 'window' })) c.navigate(c.url);
})()));
