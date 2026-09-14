import dbConnect from '@/lib/dbConnect';
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const cents = (value) => Math.round(value * 100) / 100;

// Rechnet einen Beleg Position für Position durch. Nur so lässt sich die
// Mehrwertsteuer sauber nach Sätzen trennen - der frühere Code hat sie mit
// festen Faktoren (0,35 / 0,65) geschätzt und damit falsche Beträge ausgewiesen.
function splitVat(sale, buckets) {
  (sale.items || []).forEach((item) => {
    const price = parseFloat(item.priceAtSale) || 0;
    const quantity = parseInt(item.quantity) || 0;
    const rate = parseFloat(item.vatRateAtSale) || 0;

    const brutto = price * quantity;
    const netto = brutto / (1 + rate / 100);

    if (!buckets[rate]) buckets[rate] = { rate, brutto: 0, netto: 0, vat: 0 };
    buckets[rate].brutto += brutto;
    buckets[rate].netto += netto;
    buckets[rate].vat += brutto - netto;
  });
}

export async function GET(req) {
  try {
    await dbConnect();
    const Sale = mongoose.models.Sale;
    const Product = mongoose.models.Product;

    const url = new URL(req.url);
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const dateParam = url.searchParams.get('date');
    const scope = url.searchParams.get('scope');

    const periodMode = Boolean(startDate && endDate);
    const query = { storno: false };

    if (periodMode) {
      query.saleDate = { $gte: startDate, $lte: endDate };
    } else {
      query.saleDate = dateParam || new Date().toISOString().split('T')[0];
      // Ohne scope=day zählen nur die noch offenen Belege - das ist der
      // Pausenschnitt. Mit scope=day zählt der ganze Verkaufstag, unabhängig
      // davon, wie oft zwischendurch abgeschlossen wurde (Kassenschluss).
      if (scope !== 'day') query.status = 'active';
    }

    const sales = await Sale.find(query);

    let totalRevenue = 0;
    let totalNetto = 0;
    let totalVat = 0;
    const vatBuckets = {};
    const soldById = {};
    const soldByName = {};
    const byDay = {};

    sales.forEach((sale) => {
      totalRevenue += sale.totalBrutto;
      totalNetto += sale.totalNetto;
      totalVat += sale.totalVat;
      splitVat(sale, vatBuckets);

      if (!byDay[sale.saleDate]) {
        byDay[sale.saleDate] = { date: sale.saleDate, brutto: 0, netto: 0, vat: 0, count: 0 };
      }
      byDay[sale.saleDate].brutto += sale.totalBrutto;
      byDay[sale.saleDate].netto += sale.totalNetto;
      byDay[sale.saleDate].vat += sale.totalVat;
      byDay[sale.saleDate].count += 1;

      (sale.items || []).forEach((item) => {
        const quantity = parseInt(item.quantity) || 0;
        soldByName[item.name] = (soldByName[item.name] || 0) + quantity;
        if (item.productId) {
          const id = String(item.productId);
          soldById[id] = (soldById[id] || 0) + quantity;
        }
      });
    });

    const bestSellers = Object.keys(soldByName)
      .map((name) => ({ name, totalSold: soldByName[name] }))
      .sort((a, b) => b.totalSold - a.totalSold)
      .slice(0, 5);

    // Ladenhüter und Bestandswarnungen gehen vom aktuellen Sortiment aus -
    // ein Artikel, der sich null Mal verkauft hat, ist gerade der interessante.
    const products = await Product.find({ active: { $ne: false } }).sort({ nr: 1 });

    const slowSellers = products
      .map((p) => ({ name: p.name, totalSold: soldById[String(p._id)] || 0 }))
      .sort((a, b) => a.totalSold - b.totalSold || a.name.localeCompare(b.name, 'de'))
      .slice(0, 5);

    const lowStock = products
      .filter((p) => typeof p.stock === 'number' && typeof p.minStock === 'number' && p.stock <= p.minStock)
      .map((p) => ({ name: p.name, stock: p.stock, minStock: p.minStock }))
      .sort((a, b) => a.stock - b.stock);

    const vatBreakdown = Object.values(vatBuckets)
      .map((b) => ({ rate: b.rate, brutto: cents(b.brutto), netto: cents(b.netto), vat: cents(b.vat) }))
      .sort((a, b) => a.rate - b.rate);

    const dailyRevenue = Object.values(byDay)
      .map((d) => ({ date: d.date, brutto: cents(d.brutto), netto: cents(d.netto), vat: cents(d.vat), count: d.count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      success: true,
      summary: {
        totalRevenue: cents(totalRevenue),
        totalNetto: cents(totalNetto),
        totalVat: cents(totalVat),
        salesCount: sales.length
      },
      vatBreakdown,
      bestSellers,
      slowSellers,
      lowStock,
      dailyRevenue
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
