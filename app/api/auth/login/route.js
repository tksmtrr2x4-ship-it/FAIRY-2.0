import { NextResponse } from 'next/server';
import {
  createToken,
  cookieFor,
  ttlFor,
  fingerprint,
  getExpectedPin,
  isProtectionConfigured,
  timingSafeEqual,
} from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req) {
  try {
    const { role, pin } = await req.json();

    if (role !== 'pos' && role !== 'admin') {
      return NextResponse.json({ error: 'Unbekannter Bereich.' }, { status: 400 });
    }
    if (!isProtectionConfigured()) {
      return NextResponse.json(
        { error: 'Zugriffsschutz ist nicht eingerichtet – AUTH_SECRET fehlt in den Umgebungsvariablen.' },
        { status: 503 }
      );
    }

    const expected = getExpectedPin(role);
    if (!expected) {
      const name = role === 'admin' ? 'ADMIN_PIN' : 'POS_PIN';
      return NextResponse.json(
        { error: `Für diesen Bereich ist noch keine PIN hinterlegt (${name} fehlt).` },
        { status: 503 }
      );
    }

    const matches = timingSafeEqual(
      await fingerprint(String(pin ?? '')),
      await fingerprint(expected)
    );

    if (!matches) {
      // Kurze Verzögerung, damit Durchprobieren unattraktiv bleibt.
      await new Promise((resolve) => setTimeout(resolve, 400));
      return NextResponse.json({ error: 'Falsche Eingabe.' }, { status: 401 });
    }

    const ttl = ttlFor(role);
    const response = NextResponse.json({ success: true, role });
    response.cookies.set({
      name: cookieFor(role),
      value: await createToken(role, ttl),
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: Math.floor(ttl / 1000),
    });
    return response;
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
