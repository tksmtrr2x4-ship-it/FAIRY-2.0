import { NextResponse } from 'next/server';
import { getExpectedPin, isProtectionConfigured } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Meldet nur, OB der Schutz eingerichtet ist - niemals die hinterlegten Werte.
export async function GET() {
  return NextResponse.json({
    configured: isProtectionConfigured(),
    posPinSet: getExpectedPin('pos') !== null,
    adminPinSet: getExpectedPin('admin') !== null,
  });
}
