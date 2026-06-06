const CACHE_NAME = 'b-isaf-v1';

// Recursos que serão cacheados na instalação
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/logo.svg',
];

// Instalar o Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Ativar e limpar caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Estratégia: Cache First para estáticos, Network First para dados
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ignorar requisições para o Supabase (API)
  if (url.hostname.includes('supabase.co')) {
    return; // deixa o navegador fazer a requisição normalmente
  }

  // Cache First para recursos estáticos
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        // Não cachear requisições POST/PUT/DELETE
        if (event.request.method !== 'GET') return response;

        // Cachear apenas respostas bem-sucedidas
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(() => {
        // Fallback offline para páginas HTML
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('/');
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});