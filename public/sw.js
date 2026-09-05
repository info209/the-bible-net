/**
 * Service Worker for The Bible Net
 * 
 * Provides:
 * 1. App Shell caching and offline navigation fallback
 * 2. Cache-first strategy for static assets (_next/static, fonts, icons, images)
 * 3. Stale-while-revalidate for core public assets
 * 4. Automatic cache version cleanup on activation
 */

const CACHE_VERSION = 'bible-net-v1.1.0';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const SHELL_CACHE = `shell-${CACHE_VERSION}`;

const PRECACHE_ASSETS = [
  '/',
  '/home',
  '/bible',
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
              if (url === '/' || url === '/home' || url === '/bible') {
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

// Fetch: Handle navigation, Next.js RSC, and asset requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore non-GET requests and cross-origin extension requests
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // 1. Navigation requests (HTML pages)
  // Ensures zero-network navigations, reloads, and route changes boot the App Shell
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      (async () => {
        const shellCache = await caches.open(SHELL_CACHE);

        try {
          // Try network with a 2.5 second timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2500);

          const networkResponse = await fetch(request, {
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          if (networkResponse && networkResponse.status === 200) {
            // Cache by exact URL and normalized pathname
            shellCache.put(request.url, networkResponse.clone());
            shellCache.put(url.pathname, networkResponse.clone());

            if (url.pathname === '/bible' || url.pathname.startsWith('/bible/')) {
              shellCache.put('/bible', networkResponse.clone());
            } else if (url.pathname === '/home' || url.pathname === '/') {
              shellCache.put('/home', networkResponse.clone());
              shellCache.put('/', networkResponse.clone());
            }

            return networkResponse;
          }
        } catch (err) {
          // Network failed or timed out (offline) - fall through to cached shell
        }

        // Offline multi-tiered fallback:
        // Tier 1: Exact URL match in SHELL_CACHE
        const exactMatch = await shellCache.match(request.url);
        if (exactMatch) return exactMatch;

        // Tier 2: Match ignoring search query parameters (e.g. /bible?book=Exodus&chapter=1 -> /bible)
        const ignoreSearchMatch = await shellCache.match(request.url, { ignoreSearch: true });
        if (ignoreSearchMatch) return ignoreSearchMatch;

        // Tier 3: Pathname match
        const pathnameMatch = await shellCache.match(url.pathname);
        if (pathnameMatch) return pathnameMatch;

        // Tier 4: Bible route fallback (use cached /bible shell)
        if (url.pathname === '/bible' || url.pathname.startsWith('/bible/')) {
          const bibleShell = await shellCache.match('/bible');
          if (bibleShell) return bibleShell;
        }

        // Tier 5: General App Shell fallback (/home, /, or /bible)
        const defaultShell =
          (await shellCache.match('/home')) ||
          (await shellCache.match('/')) ||
          (await shellCache.match('/bible'));
        if (defaultShell) {
          return defaultShell;
        }

        // Tier 6: Clean self-reloading fallback shell if cache is empty
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
              <p>You are offline. Please reconnect to the internet or open your downloaded Bible.</p>
              <button onclick="window.location.href='/bible'">Open Bible</button>
            </body>
          </html>`,
          { headers: { 'Content-Type': 'text/html' } },
        );
      })(),
    );
    return;
  }

  // 2. Next.js App Router RSC & Client Navigation requests
  // Intercepting RSC prevents network fetch failures that force Next.js to do hard window.location reloads
  const isRscRequest =
    url.searchParams.has('_rsc') ||
    request.headers.get('RSC') === '1' ||
    request.headers.has('Next-Router-State-Tree') ||
    request.headers.get('Next-Router-Prefetch') === '1';

  if (isRscRequest) {
    event.respondWith(
      (async () => {
        const shellCache = await caches.open(SHELL_CACHE);
        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.status === 200) {
            shellCache.put(request.url, networkResponse.clone());
            return networkResponse;
          }
        } catch (err) {
          // Offline
        }

        // Try cached RSC payload
        const cachedRsc =
          (await shellCache.match(request.url)) ||
          (await shellCache.match(request.url, { ignoreSearch: true })) ||
          (await shellCache.match(url.pathname));

        if (cachedRsc) return cachedRsc;

        // For router prefetch requests, return a clean 204 No Content
        if (request.headers.get('Next-Router-Prefetch') === '1') {
          return new Response(null, { status: 204 });
        }

        // For Bible routes, return cached /bible shell or 200 OK so client router doesn't crash
        if (url.pathname === '/bible' || url.pathname.startsWith('/bible/')) {
          const bibleShell = await shellCache.match('/bible');
          if (bibleShell) return bibleShell;
        }

        return new Response('', { status: 200, headers: { 'Content-Type': 'text/x-component' } });
      })(),
    );
    return;
  }

  // 3. Next.js Static Chunks, Assets & Fonts: Cache-First
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
          if (navigator.onLine) {
            fetch(request)
              .then(async (freshResponse) => {
                if (freshResponse && freshResponse.status === 200) {
                  const staticCache = await caches.open(STATIC_CACHE);
                  staticCache.put(request, freshResponse);
                }
              })
              .catch(() => {});
          }
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
          // If offline and not in cache, fail gracefully with 404 instead of throwing unhandled
          return cached || new Response('', { status: 404 });
        }
      })(),
    );
    return;
  }

  // 4. API Requests: Handled by network/offline database strategies in application code
});
