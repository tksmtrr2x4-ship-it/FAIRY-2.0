// lib/posStorage.js - [Lokaler Produkt-Cache der Kasse, damit sie auch ohne WLAN sofort startet]

const PRODUCTS_KEY = 'weltladen_pos_products_v1';

// Liest den zuletzt gespeicherten Produktstand. Gibt null zurück, wenn nichts
// Brauchbares im Speicher liegt (privates Fenster, geleerter Browser, alte Version).
export function readCachedProducts() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(PRODUCTS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.products)) return null;
    return { products: parsed.products, savedAt: parsed.savedAt || null };
  } catch (err) {
    console.warn('Produkt-Cache konnte nicht gelesen werden.', err);
    return null;
  }
}

// Speichert den aktuellen Produktstand. Schlägt das fehl (z. B. voller Speicher),
// läuft die Kasse trotzdem weiter - der Cache ist nur eine Beschleunigung.
export function writeCachedProducts(products) {
  if (typeof window === 'undefined') return null;
  const savedAt = Date.now();
  try {
    window.localStorage.setItem(PRODUCTS_KEY, JSON.stringify({ products, savedAt }));
  } catch (err) {
    console.warn('Produkt-Cache konnte nicht geschrieben werden.', err);
  }
  return savedAt;
}

// --- Warteschlange für noch nicht übertragene Bons ---------------------------

const QUEUE_KEY = 'weltladen_pos_queue_v1';

// Erzeugt eine eindeutige Bon-Kennung. Sie wird an den Server mitgeschickt und
// verhindert dort, dass derselbe Bon zweimal gebucht wird.
export function createClientId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `bon-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function readQueue() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Warteschlange konnte nicht gelesen werden.', err);
    return [];
  }
}

function writeQueue(queue) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    // Hier darf nichts verschluckt werden: Schlägt das Speichern fehl, ginge ein
    // Bon verloren. Der Aufrufer erfährt es über die Ausnahme.
    console.error('Warteschlange konnte nicht gespeichert werden.', err);
    throw err;
  }
}

// Legt einen Bon lokal ab, bevor er gesendet wird. Gibt die neue Warteschlange zurück.
export function enqueueSale(sale) {
  const queue = readQueue();
  queue.push(sale);
  writeQueue(queue);
  return queue;
}

// Entfernt einen Bon aus der Warteschlange - nach erfolgreicher Übertragung
// oder wenn er storniert wurde, bevor er überhaupt raus war.
export function dequeueSale(clientId) {
  const queue = readQueue().filter((sale) => sale.clientId !== clientId);
  writeQueue(queue);
  return queue;
}

// --- Verkaufshäufigkeit und Einstellungen ------------------------------------

const STATS_KEY = 'weltladen_pos_stats_v1';
const SOUND_KEY = 'weltladen_pos_sound_v1';

// Zählt, wie oft ein Artikel auf diesem Gerät verkauft wurde. Danach werden die
// Produktkacheln sortiert, damit die Renner oben stehen.
export function readProductStats() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STATS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (err) {
    console.warn('Verkaufshäufigkeit konnte nicht gelesen werden.', err);
    return {};
  }
}

export function bumpProductStats(items) {
  if (typeof window === 'undefined') return;
  try {
    const stats = readProductStats();
    items.forEach((item) => {
      if (!item.productId) return;
      stats[item.productId] = (stats[item.productId] || 0) + (item.quantity || 1);
    });
    window.localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (err) {
    console.warn('Verkaufshäufigkeit konnte nicht gespeichert werden.', err);
  }
}

export function readSoundPref() {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(SOUND_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function writeSoundPref(enabled) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SOUND_KEY, enabled ? 'on' : 'off');
  } catch (err) {
    console.warn('Ton-Einstellung konnte nicht gespeichert werden.', err);
  }
}
