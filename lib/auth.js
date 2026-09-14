// lib/auth.js - [Signierte Sitzungs-Cookies über die eingebaute Web-Crypto-Schnittstelle]
// Läuft unverändert in der Middleware (Edge) und in den API-Routen (Node).
// Bewusst ohne zusätzliche Abhängigkeit.

export const POS_COOKIE = 'weltladen_pos_session';
export const ADMIN_COOKIE = 'weltladen_admin_session';

// Einmal pro Gerät anmelden soll im Schulbetrieb einen ganzen Tag reichen.
export const POS_TTL_MS = 12 * 60 * 60 * 1000;
export const ADMIN_TTL_MS = 8 * 60 * 60 * 1000;

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  return typeof secret === 'string' && secret.length >= 16 ? secret : null;
}

// Ohne AUTH_SECRET bleibt alles offen wie bisher. Das ist Absicht: Ein fehlender
// Eintrag in Vercel darf die Kasse im laufenden Verkauf nicht aussperren. Die
// Systemsteuerung weist sichtbar darauf hin, solange das der Fall ist.
export function isProtectionConfigured() {
  return getSecret() !== null;
}

export function getExpectedPin(role) {
  const pin = role === 'admin' ? process.env.ADMIN_PIN : process.env.POS_PIN;
  return typeof pin === 'string' && pin.length > 0 ? pin : null;
}

const encoder = new TextEncoder();

function toBase64Url(buffer) {
  let binary = '';
  for (const byte of new Uint8Array(buffer)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sign(payload, secret) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return toBase64Url(await crypto.subtle.sign('HMAC', key, encoder.encode(payload)));
}

// Kennwerte vergleichen wir nicht direkt, sondern über ihren Fingerabdruck:
// der ist immer gleich lang, damit der Vergleich keine Rückschlüsse auf die
// Länge der Eingabe zulässt.
export async function fingerprint(value) {
  const secret = getSecret();
  if (!secret) return null;
  return sign(`fp.${value}`, secret);
}

// Zeichenweiser Vergleich mit gleichbleibender Laufzeit.
export function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Aufbau: <rolle>.<ablaufzeit>.<signatur>
export async function createToken(role, ttlMs) {
  const secret = getSecret();
  if (!secret) return null;
  const payload = `${role}.${Date.now() + ttlMs}`;
  return `${payload}.${await sign(payload, secret)}`;
}

// Gibt die Rolle zurück, wenn Signatur und Gültigkeit stimmen - sonst null.
export async function verifyToken(token) {
  const secret = getSecret();
  if (!secret || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [role, expiry, signature] = parts;
  if (role !== 'pos' && role !== 'admin') return null;

  const expected = await sign(`${role}.${expiry}`, secret);
  if (!timingSafeEqual(signature, expected)) return null;

  const expiresAt = Number(expiry);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return null;

  return role;
}

export function cookieFor(role) {
  return role === 'admin' ? ADMIN_COOKIE : POS_COOKIE;
}

export function ttlFor(role) {
  return role === 'admin' ? ADMIN_TTL_MS : POS_TTL_MS;
}
