import dbConnect from '@/lib/dbConnect';
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import { KLEINUNTERNEHMER } from '@/lib/tax';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const cents = (value) => Math.round(value * 100) / 100;

// Deutsches Zahlenformat mit Komma - sonst liest Excel die Beträge als Text.
const num = (value) => cents(value).toFixed(2).replace('.', ',');

function csvField(value) {
  const text = String(value ?? '');
  return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const row = (fields) => fields.map(csvField).join(';');

// Historische Werte pause1/pause2 bleiben als Rohwert erkennbar.
const STATUS_LABEL = { active: 'Offen', pause: 'Pause', closed: 'Kassenschluss' };
const statusText = (status) =>
  STATUS_LABEL[status] || (status === 'pause1' || status === 'pause2' ? `Pause (${status})` : status);

const zeitBerlin = (date) =>
  date ? new Date(date).toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin' }) : '';

// Tagesabschlüsse: eine Zeile je Verkaufstag.
function tagesabschluesse(sales) {
  const byDay = {};
  sales.forEach((sale) => {
    const day = sale.saleDate;
    if (!byDay[day]) {
      byDay[day] = { date: day, count: 0, storno: 0, brutto: 0, netto: 0, vat7: 0, vat19: 0, vatOther: 0 };
    }
    const d = byDay[day];

    if (sale.storno) {
      d.storno += 1;
      return;
    }

    d.count += 1;
    d.brutto += sale.totalBrutto;
    d.netto += sale.totalNetto;

    (sale.items || []).forEach((item) => {
      const lineBrutto = (parseFloat(item.priceAtSale) || 0) * (parseInt(item.quantity) || 0);
      const rate = parseFloat(item.vatRateAtSale) || 0;
      const lineVat = lineBrutto - lineBrutto / (1 + rate / 100);
      if (rate === 7) d.vat7 += lineVat;
      else if (rate === 19) d.vat19 += lineVat;
      else d.vatOther += lineVat;
    });
  });

  const rows = Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date));
  const sum = (key) => rows.reduce((acc, r) => acc + r[key], 0);

  if (KLEINUNTERNEHMER) {
    const lines = [row(['Datum', 'Belege', 'Stornierte Belege', 'Umsatz'])];
    rows.forEach((r) => lines.push(row([r.date, r.count, r.storno, num(r.brutto)])));
    if (rows.length > 0) lines.push(row(['Summe', sum('count'), sum('storno'), num(sum('brutto'))]));
    return lines;
  }

  const lines = [row(['Datum', 'Belege', 'Stornierte Belege', 'Umsatz brutto', 'Umsatz netto', 'MwSt 7%', 'MwSt 19%', 'MwSt sonstige'])];
  rows.forEach((r) => lines.push(row([
    r.date, r.count, r.storno, num(r.brutto), num(r.netto), num(r.vat7), num(r.vat19), num(r.vatOther)
  ])));
  if (rows.length > 0) {
    lines.push(row([
      'Summe', sum('count'), sum('storno'), num(sum('brutto')), num(sum('netto')),
      num(sum('vat7')), num(sum('vat19')), num(sum('vatOther'))
    ]));
  }
  return lines;
}

// Einzelbelege: eine Zeile je Position, stornierte Belege eingeschlossen und
// gekennzeichnet - Einzelaufzeichnungen müssen vollständig sein.
function einzelbelege(sales) {
  const kopf = ['Beleg-ID', 'Datum', 'Uhrzeit', 'Status', 'Storniert', 'Pos.', 'Artikel', 'Menge', 'Einzelpreis', 'Betrag'];
  if (!KLEINUNTERNEHMER) kopf.push('Steuersatz', 'Netto', 'Steuer');
  kopf.push('Belegsumme');

  const lines = [row(kopf)];

  sales.forEach((sale) => {
    (sale.items || []).forEach((item, index) => {
      const menge = parseInt(item.quantity) || 0;
      const preis = parseFloat(item.priceAtSale) || 0;
      const betrag = menge * preis;

      const felder = [
        String(sale._id),
        sale.saleDate,
        zeitBerlin(sale.createdAt),
        statusText(sale.status),
        sale.storno ? 'ja' : 'nein',
        index + 1,
        item.name,
        menge,
        num(preis),
        num(betrag)
      ];

      if (!KLEINUNTERNEHMER) {
        const rate = parseFloat(item.vatRateAtSale) || 0;
        const netto = betrag / (1 + rate / 100);
        felder.push(`${rate}%`, num(netto), num(betrag - netto));
      }

      felder.push(num(sale.totalBrutto));
      lines.push(row(felder));
    });
  });

  return lines;
}

export async function GET(req) {
  try {
    await dbConnect();
    const Sale = mongoose.models.Sale;

    const url = new URL(req.url);
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const art = url.searchParams.get('art') === 'belege' ? 'belege' : 'tage';

    // Bewusst OHNE Storno-Filter: Stornos werden gezählt bzw. gekennzeichnet,
    // aber nie verschwiegen.
    const query = {};
    if (startDate && endDate) query.saleDate = { $gte: startDate, $lte: endDate };

    const sales = await Sale.find(query).sort({ saleDate: 1, createdAt: 1 });
    const lines = art === 'belege' ? einzelbelege(sales) : tagesabschluesse(sales);

    const zeitraum = startDate && endDate ? `${startDate}_bis_${endDate}` : 'gesamt';
    const datei = art === 'belege' ? 'Einzelbelege' : 'Tagesabschluesse';

    // Byte Order Mark voran, damit Excel die Umlaute richtig öffnet.
    return new NextResponse('﻿' + lines.join('\r\n'), {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${datei}_${zeitraum}.csv"`
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
