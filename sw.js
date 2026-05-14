/*
Copyright © Andrew Bethell. All rights reserved.
Created by Andrew Bethell in his own time for his father following a stroke.
*/

// Service Worker for MyNewVoice PWA
// v30a_professional_visual_polish: tactile button states and styling polish only; no schema or behaviour changes.
const CACHE_NAME = 'mynewvoice-v30a-professional-visual-polish';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(urlsToCache);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME && cacheName.toLowerCase().includes('mynewvoice')) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', function(event) {
  const request = event.request;
  const destination = request.destination;
  const url = new URL(request.url);

  // App shell files should prefer the network so Android/iPhone pick up new GitHub updates.
  const isAppShell = request.mode === 'navigate' ||
    destination === 'script' ||
    destination === 'style' ||
    url.pathname.endsWith('/index.html') ||
    url.pathname.endsWith('/script.js') ||
    url.pathname.endsWith('/style.css') ||
    url.pathname.endsWith('/manifest.json');

  if (isAppShell) {
    event.respondWith(
      fetch(request).then(function(networkResponse) {
        const copy = networkResponse.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(request, copy);
        });
        return networkResponse;
      }).catch(function() {
        return caches.match(request).then(function(cached) {
          return cached || caches.match('./index.html');
        });
      })
    );
    return;
  }

  // Images and other assets can use cache first, then network.
  event.respondWith(
    caches.match(request).then(function(cached) {
      if (cached) return cached;
      return fetch(request).then(function(networkResponse) {
        if (destination === 'image' || url.pathname.match(/\.(png|jpe?g|webp|gif|svg)$/i)) {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(request, copy);
          });
        }
        return networkResponse;
      }).catch(function() {
        if (destination === 'image') {
          return new Response('', { status: 404, statusText: 'Image unavailable' });
        }
        return caches.match('./index.html');
      });
    })
  );
});

self.addEventListener('message', function(event) {
  if (event.data === 'skipWaiting' || (event.data && event.data.type === 'skipWaiting')) {
    self.skipWaiting();
  }
});
