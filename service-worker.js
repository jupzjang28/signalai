const CACHE_NAME = 'signaiai-v1';
const CACHE_URLS = [
  '/',
  '/Index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

// Install — cache shell
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(CACHE_URLS.filter(function(url) {
        // skip icons if they don't exist yet
        return !url.endsWith('.png');
      }));
    }).catch(function(err) {
      console.log('Cache install error (non-fatal):', err);
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// Fetch — network first, fallback to cache
self.addEventListener('fetch', function(e) {
  var req = e.request;

  // Skip non-GET and cross-origin API calls (Binance, TradingView)
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return;

  e.respondWith(
    fetch(req)
      .then(function(res) {
        // Cache successful responses
        if (res && res.status === 200 && res.type === 'basic') {
          var clone = res.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(req, clone);
          });
        }
        return res;
      })
      .catch(function() {
        // Network failed — serve from cache
        return caches.match(req).then(function(cached) {
          if (cached) return cached;
          // Fallback: return main page for navigation requests
          if (req.mode === 'navigate') {
            return caches.match('/Index.html');
          }
        });
      })
  );
});

// Push notification support (for future Discord-like alerts)
self.addEventListener('push', function(e) {
  if (!e.data) return;
  var data = e.data.json();
  e.waitUntil(
    self.registration.showNotification(data.title || 'SignalAI Alert', {
      body   : data.body   || '',
      icon   : '/icon-192.png',
      badge  : '/icon-192.png',
      tag    : data.tag    || 'signal',
      data   : data.url    || '/',
      vibrate: [200, 100, 200],
      actions: [
        { action: 'open',    title: 'ดู Signal' },
        { action: 'dismiss', title: 'ปิด' },
      ],
    })
  );
});

self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  if (e.action === 'dismiss') return;
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then(function(list) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].url && 'focus' in list[i]) {
          return list[i].focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(e.notification.data || '/');
      }
    })
  );
});
