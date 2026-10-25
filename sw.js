const VERSION = 'v15';
const SHELL = `shell-${VERSION}`;
const RUNTIME = `runtime-${VERSION}`;
const SHELL_FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/apple-touch-icon.png',
  './icons/apple-touch-icon-167.png',
  './icons/apple-touch-icon-152.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-1024.png',
  './icons/icon-maskable-512.png',
  './icons/icon-maskable-1024.png',
  './icons/favicon-48.png',
  './icons/favicon-32.png',
  './icons/splash-1179x2556-light.png',
  './icons/splash-1179x2556-dark.png',
  './icons/screenshot-narrow.jpg',
  './icons/screenshot-wide.jpg',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== SHELL && k !== RUNTIME) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res.ok) (await caches.open(SHELL)).put('./index.html', res.clone());
        return res;
      } catch {
        return (await caches.match('./index.html')) || (await caches.match('./')) || Response.error();
      }
    })());
    return;
  }

  if (url.origin === location.origin && url.pathname.endsWith('/config.js')) {
    e.respondWith((async () => {
      try {
        const res = await fetch(req, { cache: 'no-store' });
        if (res.ok) (await caches.open(RUNTIME)).put(req, res.clone());
        return res;
      } catch {
        return (await caches.match(req)) || new Response('window.HABIT_CONFIG = {};', { headers: { 'Content-Type': 'text/javascript' } });
      }
    })());
    return;
  }

  if (url.origin === location.origin || /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)
      || (url.hostname === 'cdn.jsdelivr.net' && url.pathname.includes('/@supabase/supabase-js@'))) {
    e.respondWith((async () => {
      const hit = await caches.match(req);
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res.ok || res.type === 'opaque') (await caches.open(RUNTIME)).put(req, res.clone());
        return res;
      } catch {
        return Response.error();
      }
    })());
  }
});
