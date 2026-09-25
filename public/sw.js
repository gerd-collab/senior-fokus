/* Fokuspunkt – Offline-Cache.
 * Strategie:
 *  - /audio/music/*  → cache-first: einmal geladen, danach offline nutzbar.
 *    Grundsätzlich wird die KOMPLETTE Datei gecacht (nie eine 206-Antwort);
 *    Range-Bitten bedient der SW aus dem Cache-Buffer.
 *  - Navigations-Requests und /assets/ → network-first mit Cache-Fallback,
 *    damit der Launcher selbst offline lädt. Metadaten (manifest.json)
 *    laufen über diesen Shell-Pfad; Audio-Dateien in Cache Storage.
 */
const AUDIO_CACHE = 'fokuspunkt-audio-v1';
const SHELL_CACHE = 'fokuspunkt-shell-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/audio/music/')) {
    e.respondWith(handleAudio(req, url));
  } else if (req.mode === 'navigate' || url.pathname.startsWith('/assets/')) {
    e.respondWith(handleShell(req));
  }
});

function rangeResponse(buf, range, contentType) {
  const m = /bytes=(\d*)-(\d*)/.exec(range);
  if (!m) return new Response(buf, { headers: { 'Content-Type': contentType } });
  let start = m[1] ? parseInt(m[1], 10) : Math.max(buf.byteLength - parseInt(m[2], 10), 0);
  let end = m[1] && m[2] ? parseInt(m[2], 10) : buf.byteLength - 1;
  end = Math.min(end, buf.byteLength - 1);
  if (start > end || start >= buf.byteLength) {
    return new Response(null, {
      status: 416,
      headers: { 'Content-Range': `bytes */${buf.byteLength}` },
    });
  }
  return new Response(buf.slice(start, end + 1), {
    status: 206,
    headers: {
      'Content-Range': `bytes ${start}-${end}/${buf.byteLength}`,
      'Accept-Ranges': 'bytes',
      'Content-Type': contentType,
    },
  });
}

async function handleAudio(req, url) {
  const cache = await caches.open(AUDIO_CACHE);
  const range = req.headers.get('range');
  let base = await cache.match(url.pathname);
  if (!base) {
    let fresh;
    try {
      fresh = await fetch(new Request(url.pathname, { headers: range ? {} : req.headers }));
    } catch (err) {
      return new Response('offline', { status: 503 });
    }
    if (!fresh.ok) return fresh;
    cache.put(url.pathname, fresh.clone());
    base = fresh;
  }
  if (!range) return base;
  const buf = await base.arrayBuffer();
  return rangeResponse(buf, range, base.headers.get('Content-Type') || 'audio/ogg');
}

async function handleShell(req) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const fresh = await fetch(req);
    if (fresh.ok) cache.put(req, fresh.clone());
    return fresh;
  } catch (err) {
    const hit = await cache.match(req);
    return hit || new Response('offline', { status: 503 });
  }
}
