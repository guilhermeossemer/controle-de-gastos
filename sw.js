// Service Worker para Controle de Gastos PWA
const CACHE_NAME = 'controle-gastos-v1';
const urlsToCache = [
    './',
    './index.html',
    './styles.css',
    './script.js',
    './manifest.json'
];

// Instalação do Service Worker
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cache aberto');
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
                        console.log('Cache antigo removido:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Interceptação de requisições
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Retorna do cache se disponível
                if (response) {
                    return response;
                }

                // Se não estiver no cache, busca da rede
                return fetch(event.request)
                    .then(response => {
                        // Verifica se a resposta é válida
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // Clona a resposta para o cache
                        const responseToCache = response.clone();

                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    })
                    .catch(() => {
                        // Se offline e não estiver no cache, retorna página offline
                        if (event.request.destination === 'document') {
                            return caches.match('./index.html');
                        }
                    });
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
    // Aqui você pode implementar sincronização com servidor
    // Por enquanto, apenas log para demonstração
    console.log('Sincronização em background executada');
}

// Notificações push (para futuras implementações)
self.addEventListener('push', event => {
    const options = {
        body: event.data ? event.data.text() : 'Nova notificação do Controle de Gastos',
        icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTkyIiBoZWlnaHQ9IjE5MiIgdmlld0JveD0iMCAwIDE5MiAxOTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxOTIiIGhlaWdodD0iMTkyIiByeD0iMjQiIGZpbGw9InVybCgjZ3JhZGllbnQwX2xpbmVhcl8xXzEpIi8+CjxwYXRoIGQ9Ik05NiA0OEM3My45MDg2IDQ4IDU2IDY1LjkwODYgNTYgODhWMTQ0QzU2IDE2Ni4wOTEgNzMuOTA4NiAxODQgOTYgMTg0QzExOC4wOTEgMTg0IDEzNiAxNjYuMDkxIDEzNiAxNDRWODhDMTM2IDY1LjkwODYgMTE4LjA5MSA0OCA5NiA0OFoiIGZpbGw9IndoaXRlIiBmaWxsLW9wYWNpdHk9IjAuOSIvPgo8cGF0aCBkPSJNODggNzJIMTA0VjEyMEg4OFY3MloiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik03MiA5NkgxMjBWMTEySDcyVjk2WiIgZmlsbD0id2hpdGUiLz4KPGRlZnM+CjxsaW5lYXJHcmFkaWVudCBpZD0iZ3JhZGllbnQwX2xpbmVhcl8xXzEiIHgxPSIwIiB5MT0iMCIgeDI9IjE5MiIgeTI9IjE5MiIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPgo8c3RvcCBzdG9wLWNvbG9yPSIjNjY3ZWVhIi8+CjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzc2NGJhMiIvPgo8L2xpbmVhckdyYWRpZW50Pgo8L2RlZnM+Cjwvc3ZnPgo=',
        badge: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTYiIGhlaWdodD0iOTYiIHZpZXdCb3g9IjAgMCA5NiA5NiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9Ijk2IiBoZWlnaHQ9Ijk2IiByeD0iMTIiIGZpbGw9IiM2NjdlZWEiLz4KPHBhdGggZD0iTTQ4IDI0SDQ4VjQ4SDQ4VjI0WiIgZmlsbD0id2hpdGUiLz4KPHBhdGggZD0iTTI0IDQ4SDQ4VjQ4SDI0VjQ4WiIgZmlsbD0id2hpdGUiLz4KPHBhdGggZD0iTTQ4IDQ4SDQ4VjcySDQ4VjQ4WiIgZmlsbD0id2hpdGUiLz4KPHBhdGggZD0iTTI0IDQ4SDQ4VjQ4SDI0VjQ4WiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+Cg==',
        vibrate: [200, 100, 200],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'Ver Detalhes',
                icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTYiIGhlaWdodD0iOTYiIHZpZXdCb3g9IjAgMCA5NiA5NiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9Ijk2IiBoZWlnaHQ9Ijk2IiByeD0iMTIiIGZpbGw9IiM2NjdlZWEiLz4KPHBhdGggZD0iTTQ4IDI0SDQ4VjQ4SDQ4VjI0WiIgZmlsbD0id2hpdGUiLz4KPHBhdGggZD0iTTI0IDQ4SDQ4VjQ4SDI0VjQ4WiIgZmlsbD0id2hpdGUiLz4KPHBhdGggZD0iTTQ4IDQ4SDQ4VjcySDQ4VjQ4WiIgZmlsbD0id2hpdGUiLz4KPHBhdGggZD0iTTI0IDQ4SDQ4VjQ4SDI0VjQ4WiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+Cg=='
            },
            {
                action: 'close',
                title: 'Fechar',
                icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTYiIGhlaWdodD0iOTYiIHZpZXdCb3g9IjAgMCA5NiA5NiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9Ijk2IiBoZWlnaHQ9Ijk2IiByeD0iMTIiIGZpbGw9IiNlNTNlM2UiLz4KPHBhdGggZD0iTTI0IDQ4SDQ4VjQ4SDI0VjQ4WiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+Cg=='
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
        event.waitUntil(
            clients.openWindow('./')
        );
    } else if (event.action === 'close') {
        // Apenas fecha a notificação
    } else {
        // Clique padrão - abre a aplicação
        event.waitUntil(
            clients.openWindow('./')
        );
    }
});
