/* ==========================================================================
   Kollektiv|ver|körpern — Service Worker (Offline Cache & Audio Range Serving)
   Scope: strictly limited to /score.html and /assets/score/ resources.
   ========================================================================== */

const CACHE_NAME = 'kvk-score-v1';
const PRECACHE_URLS = [
  '/score.html',
  '/css/styles.css',
  '/css/score.css',
  '/js/score.js',
  '/assets/score/manifest.json',
  '/assets/score/audio.mp3'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        // Precaching audio might fail if offline during install; handled progressively
        console.warn('[SW] Precache partial/complete warning:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key.startsWith('kvk-score-')) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Helper for serving byte-range requests from cache (required for iOS Safari and Chrome seeking)
async function handleAudioRangeRequest(request, cachedResponse) {
  const rangeHeader = request.headers.get('Range');
  if (!rangeHeader) {
    return cachedResponse;
  }
  const arrayBuffer = await cachedResponse.arrayBuffer();
  const totalLength = arrayBuffer.byteLength;

  const matches = /^bytes=(\d+)-(\d+)?$/i.exec(rangeHeader);
  if (!matches) {
    return new Response(null, {
      status: 416,
      headers: { 'Content-Range': `bytes */${totalLength}` }
    });
  }

  const start = parseInt(matches[1], 10);
  const end = matches[2] ? parseInt(matches[2], 10) : totalLength - 1;

  if (start >= totalLength || end >= totalLength) {
    return new Response(null, {
      status: 416,
      headers: { 'Content-Range': `bytes */${totalLength}` }
    });
  }

  const slicedBuffer = arrayBuffer.slice(start, end + 1);
  return new Response(slicedBuffer, {
    status: 206,
    statusText: 'Partial Content',
    headers: {
      'Content-Type': cachedResponse.headers.get('Content-Type') || 'audio/mpeg',
      'Content-Length': String(slicedBuffer.byteLength),
      'Content-Range': `bytes ${start}-${end}/${totalLength}`,
      'Accept-Ranges': 'bytes'
    }
  });
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // STRICT SCOPE: Only intercept Kollektiv|ver|körpern URLs
  const isAppUrl =
    url.pathname === '/score.html' ||
    url.pathname === '/score' ||
    url.pathname === '/css/score.css' ||
    url.pathname === '/css/styles.css' ||
    url.pathname === '/js/score.js' ||
    url.pathname.startsWith('/assets/score/');

  if (!isAppUrl) {
    // Pass through untouched to CMS, other pages, workers, and external assets
    return;
  }

  // Special handling for audio file to support Range requests when cached
  if (url.pathname.endsWith('/assets/score/audio.mp3')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        // Always match using URL without query or range headers
        const cached = await cache.match('/assets/score/audio.mp3');
        if (cached) {
          return handleAudioRangeRequest(event.request, cached);
        }
        return fetch(event.request);
      })
    );
    return;
  }

  // Cache-first, network fallback for app shell and manifest
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      });
    })
  );
});
