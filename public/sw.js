/**
 * Service Worker for The Bible Net
 * 
 * Provides:
 * 1. App Shell caching and offline navigation fallback
 * 2. Cache-first strategy for static assets (_next/static, fonts, icons, images)
 * 3. Stale-while-revalidate for core public assets
 * 4. Automatic cache version cleanup on activation
 */

const CACHE_VERSION = 'bible-net-v1.0.0';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const SHELL_CACHE = `shell-${CACHE_VERSION}`;

const PRECACHE_ASSETS = [
  '/',
  '/home',
  '/manifest.json',
  '/logo.svg',
  '/banner_bible.jpg',
  '/banner_journal_and_prayers.svg',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/apple-touch-icon.png',
  '/icons/icon-maskable.png',
];

// Install: Pre-cache App Shell and core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const [staticCache, shellCache] = await Promise.all([
        caches.open(STATIC_CACHE),
        caches.open(SHELL_CACHE),
      ]);

      // Cache core assets safely
      await Promise.allSettled(
        PRECACHE_ASSETS.map(async (url) => {
          try {
            const response = await fetch(url, { cache: 'no-cache' });
            if (response.ok) {
              if (url === '/' || url === '/home') {
                await shellCache.put(url, response.clone());
              } else {
                await staticCache.put(url, response.clone());
              }
            }
          } catch (err) {
            console.warn(`[SW] Precache failed for ${url}:`, err);
          }
        }),
      );

      // Force this SW to become active immediately
      return self.skipWaiting();
    })(),
  );
});

// Activate: Clean up older cache versions and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const expectedCaches = [STATIC_CACHE, SHELL_CACHE];
      const cacheNames = await caches.keys();

      await Promise.all(
        cacheNames.map((name) => {
          if (!expectedCaches.includes(name)) {
            console.log(`[SW] Deleting obsolete cache: ${name}`);
            return caches.delete(name);
          }
        }),
      );

      // Take control of all open pages immediately
      await self.clients.claim();
    })(),
  );
});

// Fetch: Handle navigation and asset requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore non-GET requests and cross-origin extension requests
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // 1. Navigation requests (HTML pages)
  // Ensures cold start with zero network boots the App Shell
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      (async () => {
        try {
          // Try network with a 2.5 second timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2500);

          const networkResponse = await fetch(request, {
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          if (networkResponse && networkResponse.status === 200) {
            const shellCache = await caches.open(SHELL_CACHE);
            // Cache this HTML for this exact URL and also update default /home shell
            shellCache.put(request.url, networkResponse.clone());
            shellCache.put('/home', networkResponse.clone());
            return networkResponse;
          }
        } catch (err) {
          // Network failed or timed out (offline)
        }

        // Offline fallback: First try cached page for this URL
        const shellCache = await caches.open(SHELL_CACHE);
        const cachedPage = await shellCache.match(request.url);
        if (cachedPage) {
          return cachedPage;
        }

        // Fallback to /home or root App Shell
        const defaultShell =
          (await shellCache.match('/home')) || (await shellCache.match('/'));
        if (defaultShell) {
          return defaultShell;
        }

        // Return a basic HTML fallback response if no shell is in cache
        return new Response(
          `<!DOCTYPE html>
          <html lang="en">
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
              <title>The Bible Net</title>
              <link rel="manifest" href="/manifest.json">
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8fafb; color: #1e293b; text-align: center; padding: 20px; }
                h1 { font-size: 22px; margin-bottom: 8px; color: #006a6f; }
                p { font-size: 14px; color: #64748b; max-width: 320px; line-height: 1.5; }
                button { margin-top: 16px; background: #006a6f; color: white; border: none; padding: 10px 20px; border-radius: 9999px; font-weight: bold; cursor: pointer; }
              </style>
            </head>
            <body>
              <h1>The Bible Net</h1>
              <p>You are offline. Please reconnect to the internet to load this page.</p>
              <button onclick="window.location.reload()">Reload</button>
            </body>
          </html>`,
          { headers: { 'Content-Type': 'text/html' } },
        );
      })(),
    );
    return;
  }

  // 2. Next.js Static Chunks, Assets & Fonts: Cache-First
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/assets/') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.woff') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js')
  ) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) {
          // Return cache and revalidate in background if online
          fetch(request)
            .then(async (freshResponse) => {
              if (freshResponse && freshResponse.status === 200) {
                const staticCache = await caches.open(STATIC_CACHE);
                staticCache.put(request, freshResponse);
              }
            })
            .catch(() => {});
          return cached;
        }

        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.status === 200) {
            const staticCache = await caches.open(STATIC_CACHE);
            staticCache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch (err) {
          // If offline and not in cache, let it fail
          return cached || Response.error();
        }
      })(),
    );
    return;
  }

  // 3. API Requests: Let network handle them. (Offline data fallback is handled by IndexedDB in app code)
  // Do not intercept or cache dynamically mutating API routes in SW to prevent cache corruption.
});
