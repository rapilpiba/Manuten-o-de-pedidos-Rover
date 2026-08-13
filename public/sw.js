/**
 * Service worker da Rover Pizzaria.
 *
 * Estratégia: a aplicação é guardada no aparelho na instalação e servida a
 * partir dali. Como não existe servidor de dados, uma vez instalada ela
 * funciona igual com ou sem internet.
 *
 * A versão do cache muda a cada publicação (o Vite gera nomes de arquivo com
 * hash), então basta trocar o número abaixo ao publicar uma atualização.
 */
const CACHE = 'rover-pizzaria-v1';

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(['./', './index.html', './manifest.webmanifest', './rover-pizzaria-logo.png']))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((chaves) => Promise.all(chaves.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (evento) => {
  const requisicao = evento.request;
  if (requisicao.method !== 'GET') return;

  const url = new URL(requisicao.url);
  if (url.origin !== self.location.origin) return;

  // Navegação: tenta a rede para pegar atualizações, cai para o cache offline.
  if (requisicao.mode === 'navigate') {
    evento.respondWith(
      fetch(requisicao)
        .then((resposta) => {
          const copia = resposta.clone();
          caches.open(CACHE).then((cache) => cache.put('./index.html', copia));
          return resposta;
        })
        .catch(() => caches.match('./index.html').then((r) => r || caches.match('./')))
    );
    return;
  }

  // Demais arquivos: o cache responde primeiro, porque os nomes têm hash.
  evento.respondWith(
    caches.match(requisicao).then((emCache) => emCache || fetch(requisicao).then((resposta) => {
      if (resposta.ok) {
        const copia = resposta.clone();
        caches.open(CACHE).then((cache) => cache.put(requisicao, copia));
      }
      return resposta;
    }))
  );
});
