import { NextResponse } from 'next/server';
import { POS_COOKIE, ADMIN_COOKIE, cookieFor } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req) {
  let names = [POS_COOKIE, ADMIN_COOKIE];
  try {
    const { role } = await req.json();
    if (role === 'pos' || role === 'admin') names = [cookieFor(role)];
  } catch {
    // Ohne Angabe werden beide Sitzungen beendet.
  }

  const response = NextResponse.json({ success: true });
  names.forEach((name) => {
    response.cookies.set({ name, value: '', path: '/', maxAge: 0 });
  });
  return response;
}
