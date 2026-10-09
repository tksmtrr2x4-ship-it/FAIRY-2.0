// app/api/admin/health/route.js - [Systemzustand für die Systemsteuerung]
// Reine Messroute: liest Kennzahlen der Datenbank und der Laufzeitumgebung und
// schreibt selbst nichts. Vercel stellt zur Laufzeit keine eigenen Kontingent-
// werte bereit, deshalb beschränkt sich "Speicherplatz" bewusst auf MongoDB -
// die einzige Stelle, an der die Daten dieses Projekts wachsen.
import dbConnect from '@/lib/dbConnect';
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import { isProtectionConfigured, getExpectedPin } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Atlas nennt die Tarifgrenze nicht selbst. 512 MB entspricht dem kostenlosen
// Tarif M0. Wer später einen größeren Tarif bucht, kann die Grenze über die
// Umgebungsvariable DB_SPEICHER_LIMIT_MB anheben, ohne Code zu ändern.
const LIMIT_MB = Number(process.env.DB_SPEICHER_LIMIT_MB) || 512;
const LIMIT_BYTES = LIMIT_MB * 1024 * 1024;

export async function GET() {
  const gemessenUm = new Date().toISOString();

  const laufzeit = {
    region: process.env.VERCEL_REGION || null,
    umgebung: process.env.VERCEL_ENV || 'lokal',
    nodeVersion: process.version,
  };

  const schutz = {
    eingerichtet: isProtectionConfigured(),
    posPinGesetzt: getExpectedPin('pos') !== null,
    adminPinGesetzt: getExpectedPin('admin') !== null,
  };

  try {
    await dbConnect();

    // Die Stoppuhr läuft erst nach dem Verbindungsaufbau: beim ersten Aufruf
    // nach einer Pause baut Vercel die Verbindung neu auf, das wären mehrere
    // Sekunden und hätte nichts mit der tatsächlichen Antwortzeit zu tun.
    const db = mongoose.connection.db;
    const vorPing = Date.now();
    await db.admin().command({ ping: 1 });
    const antwortzeitMs = Date.now() - vorPing;

    let stats = null;
    try {
      stats = await db.stats();
    } catch {
      // Manche Atlas-Tarife verweigern dbStats. Dann bleibt die Speicheranzeige
      // leer, der Rest der Messung ist davon nicht betroffen.
      stats = null;
    }

    const Sale = mongoose.models.Sale;
    const [anzahlBelege, letzterBeleg, anzahlProdukte] = await Promise.all([
      Sale.estimatedDocumentCount(),
      Sale.findOne({}, { saleDate: 1, createdAt: 1 }).sort({ createdAt: -1 }).lean(),
      mongoose.models.Product.estimatedDocumentCount(),
    ]);

    const belegtBytes = stats ? (stats.dataSize || 0) + (stats.indexSize || 0) : null;

    return NextResponse.json({
      success: true,
      gemessenUm,
      datenbank: {
        verbunden: mongoose.connection.readyState === 1,
        name: db.databaseName,
        antwortzeitMs,
        belegtBytes,
        datenBytes: stats ? stats.dataSize || 0 : null,
        indexBytes: stats ? stats.indexSize || 0 : null,
        limitBytes: LIMIT_BYTES,
        prozent: belegtBytes === null ? null : (belegtBytes / LIMIT_BYTES) * 100,
        datensaetze: stats ? stats.objects || 0 : null,
        fehler: null,
      },
      bestand: {
        belege: anzahlBelege,
        produkte: anzahlProdukte,
        letzterBelegAm: letzterBeleg?.saleDate || null,
        letzterBelegUm: letzterBeleg?.createdAt || null,
      },
      laufzeit,
      schutz,
    });
  } catch (error) {
    // Bewusst Status 200: Die Messung ist geglückt, ihr Ergebnis lautet
    // "Datenbank nicht erreichbar". Das Dashboard soll das rot anzeigen und
    // nicht in den allgemeinen Fehlerzweig fallen.
    return NextResponse.json({
      success: true,
      gemessenUm,
      datenbank: {
        verbunden: false,
        name: null,
        antwortzeitMs: null,
        belegtBytes: null,
        datenBytes: null,
        indexBytes: null,
        limitBytes: LIMIT_BYTES,
        prozent: null,
        datensaetze: null,
        fehler: error?.message || 'Unbekannter Fehler',
      },
      bestand: null,
      laufzeit,
      schutz,
    });
  }
}
