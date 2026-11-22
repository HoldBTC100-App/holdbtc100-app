/* Hold BTC 100 · service worker: abre offline depois da primeira visita.
   No modo 100% offline (marcado pelo app em caches 'holdbtc100-flags'), serve só o que está
   no aparelho e bloqueia qualquer acesso à internet.
   As fontes vêm embutidas no index.html desde a 1.8.9: nenhum acesso a serviços de fontes.
   Resposta de erro do site (404, 5xx) nunca substitui o app guardado: com o site fora do ar, abre a cópia do aparelho (1.8.10).
   Só a navegação para o próprio app (/ ou /index.html) vira a cópia do index.html. Até a 1.8.11, abrir outra página do
   site (a política de privacidade) gravava essa página no lugar do app, e o app aberto sem internet mostrava a política.
   A política fica guardada também, para abrir sem internet (1.8.12).
   Troque CACHE a cada versão publicada para os aparelhos baixarem a nova. */
const CACHE = 'holdbtc100-v1.8.24';
const FLAGS = 'holdbtc100-flags';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];
const EXTRA = ['./privacidade.html'];   // se faltar no site, a instalação segue sem ela
const isAPI = h => /coingecko|binance|mempool\.space|blockstream\.info|bcb\.gov\.br|frankfurter/.test(h);   // blockstream.info: outro servidor da importação (1.8.14)
const isApp = u => /\/(index\.html)?$/.test(u.pathname);

self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL).then(() => c.addAll(EXTRA).catch(() => { }))).then(() => self.skipWaiting())); });
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
  const nav = req.mode === 'navigate', copia = nav && isApp(url) ? './index.html' : req;
  const off = await caches.match('/__offline', { cacheName: FLAGS }).catch(() => null);
  if (off) {
    if (!same) return Response.error();
    return (await caches.match(copia, { ignoreSearch: true })) || Response.error();
  }
  if (isAPI(url.hostname)) return fetch(req);
  if (nav) {
    try {
      const r = await fetch(req);
      if (r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(copia, cp)); return r; }
      return (await caches.match(copia, { ignoreSearch: true })) || r;   // site fora do ar ou em troca de repositório: abre o que está no aparelho
    } catch (err) { return (await caches.match(copia, { ignoreSearch: true })) || Response.error(); }
  }
  const hit = await caches.match(req); if (hit) return hit;
  const r = await fetch(req); if (r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return r;
}
