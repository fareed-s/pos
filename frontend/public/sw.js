// POS Management System — service worker.
//
// Hand-rolled (no Workbox / vite-plugin-pwa) so we don't carry a deprecated
// dependency. Three caching layers tuned for a SPA + REST backend:
//
//   1. APP SHELL (precache) — cache-first.
//      The HTML, manifest, and a couple of base assets are precached on install.
//      Hashed Vite bundle files are cached at runtime as they're requested.
//
//   2. STATIC RUNTIME (assets, icons, fonts, /uploads) — cache-first w/ revalidation.
//      Long-lived, content-hashed → safe to serve from cache and refresh in the
//      background. Includes uploaded khata proof images & voice notes.
//
//   3. API (/api/...) — network-first with timeout.
//      Always try fresh data; fall back to last-good cached response only if
//      offline. GET requests only — POST/PUT/DELETE never cached.
//
// Bump CACHE_VERSION when you ship breaking changes to the SW logic.
// Hashed bundles invalidate themselves; this version only matters for the
// shell + the cache name.

const CACHE_VERSION = 'v1';
const APP_SHELL_CACHE = `pos-shell-${CACHE_VERSION}`;
const STATIC_CACHE = `pos-static-${CACHE_VERSION}`;
const API_CACHE = `pos-api-${CACHE_VERSION}`;

const SHELL_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon.svg',
  '/icons/icon-maskable.svg',
];

const API_TIMEOUT_MS = 6000;

// ─── Install: precache the app shell ─────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) =>
      // `addAll` aborts the whole batch on a single failure — use individual
      // adds so a missing file (e.g. icon not yet generated) doesn't break
      // installation.
      Promise.allSettled(SHELL_URLS.map((url) => cache.add(new Request(url, { cache: 'reload' }))))
    )
  );
  // Activate immediately on first install so the page can use it without a refresh.
  self.skipWaiting();
});

// ─── Activate: drop old version caches ───────────────────────────────────────
self.addEventListener('activate', (event) => {
  const expected = new Set([APP_SHELL_CACHE, STATIC_CACHE, API_CACHE]);
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !expected.has(k)).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ─── Fetch: route to the right strategy ──────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET — let everything else go straight to network.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Cross-origin (Cloudinary, Google Fonts CSS, etc.) — opaque, just pass through.
  // We DO cache same-origin responses including /uploads (local proof storage).
  if (url.origin !== self.location.origin) return;

  // SPA navigation: serve cached index.html on offline so the app boots.
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }

  // /api/... → network first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // /uploads/... and static assets → cache first
  if (
    url.pathname.startsWith('/uploads/') ||
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/icons/') ||
    /\.(?:js|css|woff2?|ttf|otf|svg|png|jpe?g|webp|gif|ico)$/i.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Default: try network, fall back to cache.
  event.respondWith(networkFirst(request, STATIC_CACHE));
});

// ─── Strategies ──────────────────────────────────────────────────────────────
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) {
    // Stale-while-revalidate: refresh in background but don't block the response.
    event_revalidate(request, cache);
    return hit;
  }
  try {
    const fresh = await fetch(request);
    if (fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch (err) {
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

function event_revalidate(request, cache) {
  // Fire-and-forget. Failures are silent (we already returned from cache).
  fetch(request).then((res) => { if (res.ok) cache.put(request, res.clone()); }).catch(() => {});
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const fresh = await Promise.race([
      fetch(request),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), API_TIMEOUT_MS)
      ),
    ]);
    if (fresh && fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ success: false, message: 'Offline', offline: true }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function handleNavigation(request) {
  try {
    // Try fresh shell first so updated HTML lands as soon as the network is back.
    const fresh = await fetch(request);
    const cache = await caches.open(APP_SHELL_CACHE);
    cache.put('/index.html', fresh.clone());
    return fresh;
  } catch (err) {
    const cache = await caches.open(APP_SHELL_CACHE);
    const cached = (await cache.match('/index.html')) || (await cache.match('/'));
    if (cached) return cached;
    return new Response('You are offline and no cached page is available.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

// ─── Messages from the page ──────────────────────────────────────────────────
// Used by the in-app "Update available — reload" toast.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
