// Service Worker para Controle de Gastos PWA

const CACHE_NAME = 'controle-gastos-v3';
const urlsToCache = [
  './index.html',
  './styles.css',
  './script.js',
  './favicon.png',
  './icon-192.png',
  './icon-512.png'
];

// Instalação do Service Worker
self.addEventListener('install', event => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('✅ Cache aberto');
      return cache.addAll(urlsToCache);
    })
  );
});

// Ativação do Service Worker
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Cache antigo removido:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Interceptação de requisições
self.addEventListener('fetch', event => {

  const requestUrl = new URL(event.request.url);

  if (requestUrl.origin !== location.origin) {
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('./index.html'))
    );
    return;
  }

  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});

// Sincronização em background
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

// Função de sincronização em background
function doBackgroundSync() {
  console.log('🔄 Sincronização em background executada');
}

// Notificações push (opcional)
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'Nova notificação do Controle de Gastos',
    icon: './icon-192.png',
    badge: './icon-192.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Ver Detalhes'
      },
      {
        action: 'close',
        title: 'Fechar'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Controle de Gastos', options)
  );
});

// Clique em notificação
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(clients.openWindow('./'));
  } else if (event.action === 'close') {
    // só fecha
  } else {
    event.waitUntil(clients.openWindow('./'));
  }
});