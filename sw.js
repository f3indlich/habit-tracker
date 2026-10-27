const VERSION = '1.03a';
const SHELL = `shell-${VERSION}`;
const RUNTIME = `runtime-${VERSION}`;
const PREFS = 'prefs';
const LOCAL = ['localhost', '127.0.0.1'].includes(self.location.hostname);
const SHELL_FILES = [
  './',
  './index.html',
  `./styles.css?v=${VERSION}`,
  `./app.js?v=${VERSION}`,
  ...['core', 'icons', 'storage', 'ui', 'render', 'form', 'history', 'settings', 'sync', 'push', 'summary'].map(m => `./js/${m}.js?v=${VERSION}`),
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
  if (LOCAL) return self.skipWaiting();
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(SHELL_FILES.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    if (LOCAL) {
      for (const k of await caches.keys()) await caches.delete(k);
      await self.registration.unregister();
      for (const c of await self.clients.matchAll({ type: 'window' })) c.navigate(c.url).catch(() => {});
      return;
    }
    for (const k of await caches.keys()) if (k !== SHELL && k !== RUNTIME && k !== PREFS) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (LOCAL || req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.pathname.includes('/tests/') || url.pathname.endsWith('.ts')) return;

  if (req.mode === 'navigate') {
    const root = new URL('./', self.location).pathname;
    if (url.origin !== location.origin || (url.pathname !== root && url.pathname !== root + 'index.html')) return;
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

async function notifyMode() {
  try {
    const r = await (await caches.open(PREFS)).match(new URL('__prefs/notify', self.registration.scope).href);
    return r ? await r.text() : 'show';
  } catch { return 'show'; }
}

function notifyView(d, mode) {
  const ids = Array.isArray(d.ids) ? d.ids : [];
  if (mode === 'hide') return { title: 'Трекер привычек', body: ids.length > 1 ? `Пора отметить привычки: ${ids.length}` : 'Пора отметить привычку', ids, done: false };
  return { title: d.title || 'Трекер привычек', body: d.body || '', ids, done: ids.length === 1 };
}

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data?.text() || '' }; }
  e.waitUntil((async () => {
    const v = notifyView(d, await notifyMode());
    await self.registration.showNotification(v.title, {
      body: v.body,
      icon: './icons/icon-192.png',
      tag: d.tag || 'habit-reminder',
      renotify: true,
      data: { ids: v.ids },
      actions: v.done ? [{ action: 'done', title: 'Выполнено' }] : [],
    });
  })());
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const ids = e.notification.data?.ids || [];
  const done = e.action === 'done' && ids.length === 1 ? ids[0] : null;
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const win = wins.find(w => w.url.startsWith(self.registration.scope));
    if (win) {
      if (done) win.postMessage({ type: 'done', id: done });
      return win.focus();
    }
    return self.clients.openWindow(new URL(done ? `./?done=${encodeURIComponent(done)}` : './', self.registration.scope).href);
  })());
});
