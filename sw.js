/* Hold BTC 100 · service worker: abre offline depois da primeira visita.
   No modo 100% offline (marcado pelo app em caches 'holdbtc100-flags'), serve só o que está
   no aparelho e bloqueia qualquer acesso à internet.
   As fontes vêm embutidas no index.html desde a 1.8.9: nenhum acesso a serviços de fontes.
   Resposta de erro do site (404, 5xx) nunca substitui o app guardado: com o site fora do ar, abre a cópia do aparelho (1.8.10).
   Troque CACHE a cada versão publicada para os aparelhos baixarem a nova. */
const CACHE = 'holdbtc100-v1.8.10';
const FLAGS = 'holdbtc100-flags';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];
const isAPI = h => /coingecko|binance|mempool\.space|bcb\.gov\.br|frankfurter/.test(h);

self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('holdbtc100-') && k !== CACHE && k !== FLAGS).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url), same = url.origin === location.origin;
  if (!same && !isAPI(url.hostname)) return;
  e.respondWith(handle(req, url, same));
});
async function handle(req, url, same) {
  const off = await caches.match('/__offline', { cacheName: FLAGS }).catch(() => null);
  if (off) {
    if (!same) return Response.error();
    return (await caches.match(req.mode === 'navigate' ? './index.html' : req, { ignoreSearch: true })) || Response.error();
  }
  if (isAPI(url.hostname)) return fetch(req);
  if (req.mode === 'navigate') {
    try {
      const r = await fetch(req);
      if (r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put('./index.html', cp)); return r; }
      return (await caches.match('./index.html')) || r;   // site fora do ar ou em troca de repositório: abre o que está no aparelho
    } catch (err) { return (await caches.match('./index.html')) || Response.error(); }
  }
  const hit = await caches.match(req); if (hit) return hit;
  const r = await fetch(req); if (r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return r;
}
