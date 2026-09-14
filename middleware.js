// middleware.js - [Serverseitiger Zugriffsschutz für Seiten UND API]
// Der Schutz sitzt bewusst hier und nicht nur im Frontend: Vorher konnte jeder
// mit der blossen URL Produkte anlegen, Preise ändern oder Umsätze buchen.
import { NextResponse } from 'next/server';
import { POS_COOKIE, ADMIN_COOKIE, verifyToken, isProtectionConfigured } from '@/lib/auth';

// 'admin' = nur Systemsteuerung · 'any' = Kasse oder Systemsteuerung · null = offen
function requiredRole(pathname, method) {
  // Die Anmeldung selbst muss ohne Anmeldung erreichbar sein.
  if (pathname.startsWith('/api/auth')) return null;

  // Die Startseite fragt den Wartungsmodus ab, bevor jemand angemeldet ist.
  if (pathname === '/api/settings') return method === 'GET' ? null : 'admin';

  // Den Tagesbericht braucht auch die Kasse für den Z-Bon, alles andere
  // unterhalb von /api/admin ist reine Auswertung.
  if (pathname === '/api/admin/stats') return 'any';
  if (pathname.startsWith('/api/admin')) return 'admin';

  // Das vollständige Journal ist Auswertung, der Verkauf selbst nicht.
  if (pathname === '/api/sales') return method === 'GET' ? 'admin' : 'any';

  if (pathname.startsWith('/api/products')) return method === 'GET' ? 'any' : 'admin';
  if (pathname.startsWith('/api/periods')) return 'admin';

  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/pos')) return 'any';

  return null;
}

export async function middleware(req) {
  if (!isProtectionConfigured()) return NextResponse.next();

  const { pathname } = req.nextUrl;
  const needed = requiredRole(pathname, req.method);
  if (!needed) return NextResponse.next();

  const isAdmin = (await verifyToken(req.cookies.get(ADMIN_COOKIE)?.value)) === 'admin';
  const isPos = (await verifyToken(req.cookies.get(POS_COOKIE)?.value)) === 'pos';

  if (needed === 'admin' ? isAdmin : isAdmin || isPos) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      { error: 'Nicht angemeldet. Bitte in der Kasse bzw. Systemsteuerung anmelden.' },
      { status: 401 }
    );
  }

  const url = req.nextUrl.clone();
  url.pathname = '/anmelden';
  url.search = `?ziel=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/admin/:path*', '/pos/:path*', '/api/:path*'],
};
