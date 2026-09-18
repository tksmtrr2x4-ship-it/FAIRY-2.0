// public/sw.js - [Service Worker: damit sich die Kasse auch ohne Netz öffnen lässt]
//
// Grundsätze:
// - API-Aufrufe werden NIE zwischengespeichert. Verkäufe laufen ausschließlich
//   über die Warteschlange der Kasse, Produkte über deren eigenen Cache.
// - Die Kassenseite selbst: erst Netz, bei Ausfall die zuletzt gespeicherte Fassung.
// - Programmdateien unter /_next/static tragen einen Inhalts-Hash im Namen und
//   ändern sich nie - die kommen direkt aus dem Speicher.

const CACHE = 'weltladen-kasse-v1';
const KASSE = '/pos';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const namen = await caches.keys();
    await Promise.all(namen.filter((n) => n !== CACHE).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

// Eine Antwort taugt nur zum Speichern, wenn sie vollständig ist und nicht
// umgeleitet wurde - sonst landet z. B. die Anmeldeseite unter /pos im Speicher.
const speicherbar = (res) => res && res.ok && !res.redirected && res.type === 'basic';

async function merken(request, response) {
  if (!speicherbar(response)) return;
  const cache = await caches.open(CACHE);
  await cache.put(request, response);
}

async function netzZuerst(request) {
  try {
    const antwort = await fetch(request);
    if (new URL(request.url).pathname === KASSE) merken(KASSE, antwort.clone());
    return antwort;
  } catch (err) {
    const cache = await caches.open(CACHE);
    const gespeichert = await cache.match(request, { ignoreSearch: true })
      || (new URL(request.url).pathname.startsWith(KASSE) ? await cache.match(KASSE) : null);
    if (gespeichert) return gespeichert;
    return new Response(
      '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width">' +
      '<body style="font-family:system-ui;padding:40px;text-align:center;color:#1D1D1F">' +
      '<h1 style="color:#D31329">Keine Verbindung</h1>' +
      '<p>Diese Seite war auf diesem Gerät noch nicht gespeichert.<br>Bitte WLAN herstellen und neu laden.</p>',
      { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}

async function speicherZuerst(request) {
  const cache = await caches.open(CACHE);
  const gespeichert = await cache.match(request);
  if (gespeichert) return gespeichert;
  const antwort = await fetch(request);
  merken(request, antwort.clone());
  return antwort;
}

async function speicherDannNetz(request) {
  const cache = await caches.open(CACHE);
  const gespeichert = await cache.match(request);
  const netz = fetch(request)
    .then((antwort) => { merken(request, antwort.clone()); return antwort; })
    .catch(() => null);
  return gespeichert || (await netz) || Response.error();
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(netzZuerst(request));
    return;
  }
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(speicherZuerst(request));
    return;
  }
  if (
    url.pathname.startsWith('/_next/image') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.webmanifest' ||
    url.pathname === '/apple-icon.png' ||
    url.pathname === '/favicon.ico'
  ) {
    event.respondWith(speicherDannNetz(request));
  }
});

// Die Kasse schickt nach dem Laden die Liste aller Dateien, die sie tatsächlich
// gebraucht hat. So liegt beim nächsten Start ohne Netz alles bereit - auch das,
// was schon geladen war, bevor dieser Service Worker aktiv wurde.
self.addEventListener('message', (event) => {
  if (!event.data || event.data.type !== 'KASSE_SPEICHERN') return;
  const urls = Array.isArray(event.data.urls) ? event.data.urls : [];

  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(urls.map(async (adresse) => {
      try {
        const url = new URL(adresse, self.location.origin);
        if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
        const antwort = await fetch(url.href, { credentials: 'same-origin' });
        if (speicherbar(antwort)) await cache.put(url.pathname === KASSE ? KASSE : url.href, antwort);
      } catch (err) {
        // Einzelne Datei nicht erreichbar - beim nächsten Start neuer Versuch.
      }
    }));
  })());
});
