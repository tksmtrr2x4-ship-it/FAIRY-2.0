import dbConnect from '@/lib/dbConnect';
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const cents = (value) => Math.round(value * 100) / 100;

// Deutsches Zahlenformat mit Komma - sonst liest Excel die Beträge als Text.
const num = (value) => cents(value).toFixed(2).replace('.', ',');

function csvField(value) {
  const text = String(value ?? '');
  return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function GET(req) {
  try {
    await dbConnect();
    const Sale = mongoose.models.Sale;

    const url = new URL(req.url);
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    const query = { storno: false };
    if (startDate && endDate) query.saleDate = { $gte: startDate, $lte: endDate };

    const sales = await Sale.find(query);

    // Ein Tagesabschluss je Verkaufstag - unabhängig davon, wie oft die Kasse
    // zwischendurch geschnitten wurde.
    const byDay = {};
    sales.forEach((sale) => {
      const day = sale.saleDate;
      if (!byDay[day]) {
        byDay[day] = { date: day, count: 0, brutto: 0, netto: 0, vat7: 0, vat19: 0, vatOther: 0 };
      }
      byDay[day].count += 1;
      byDay[day].brutto += sale.totalBrutto;
      byDay[day].netto += sale.totalNetto;

      (sale.items || []).forEach((item) => {
        const price = parseFloat(item.priceAtSale) || 0;
        const quantity = parseInt(item.quantity) || 0;
        const rate = parseFloat(item.vatRateAtSale) || 0;
        const lineBrutto = price * quantity;
        const lineVat = lineBrutto - lineBrutto / (1 + rate / 100);

        if (rate === 7) byDay[day].vat7 += lineVat;
        else if (rate === 19) byDay[day].vat19 += lineVat;
        else byDay[day].vatOther += lineVat;
      });
    });

    const rows = Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date));

    const header = ['Datum', 'Belege', 'Umsatz brutto', 'Umsatz netto', 'MwSt 7%', 'MwSt 19%', 'MwSt sonstige'];
    const lines = [header.join(';')];

    rows.forEach((row) => {
      lines.push([
        row.date,
        row.count,
        num(row.brutto),
        num(row.netto),
        num(row.vat7),
        num(row.vat19),
        num(row.vatOther)
      ].map(csvField).join(';'));
    });

    if (rows.length > 0) {
      const sum = (key) => rows.reduce((acc, row) => acc + row[key], 0);
      lines.push([
        'Summe',
        sum('count'),
        num(sum('brutto')),
        num(sum('netto')),
        num(sum('vat7')),
        num(sum('vat19')),
        num(sum('vatOther'))
      ].map(csvField).join(';'));
    }

    const zeitraum = startDate && endDate ? `${startDate}_bis_${endDate}` : 'gesamt';

    // Byte Order Mark voran, damit Excel die Umlaute richtig öffnet.
    return new NextResponse('﻿' + lines.join('\r\n'), {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="Tagesabschluesse_${zeitraum}.csv"`
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
