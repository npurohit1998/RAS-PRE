// ══════════════════════════════════════════════
// RAS Pre — Service Worker (Session 6)
// कैश: static assets | नेटवर्क: Supabase API calls
// ══════════════════════════════════════════════
const CACHE_NAME = 'raspre-cache-v1';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// ── INSTALL: static assets कैश करें ──
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: पुराने cache versions हटाएं ──
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH: Supabase/API calls को कभी cache न करें, सीधे network पर भेजें ──
// बाकी (HTML/CSS/JS/icons): cache-first, fail होने पर network, दोनों fail हों तो offline fallback
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Supabase API या किसी भी external API calls को SW टच न करे
  if (url.includes('supabase.co') || url.includes('googleapis.com')) {
    return; // browser को normal network request करने दें
  }

  // सिर्फ GET requests cache करें
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          // सफल response को भी आगे के लिए cache कर लें
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          // नेटवर्क भी नहीं, cache भी नहीं — मुख्य पेज दिखा दें (offline fallback)
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
    })
  );
});
