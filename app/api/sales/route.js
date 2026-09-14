import dbConnect from '@/lib/dbConnect';
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    await dbConnect();
    const Sale = mongoose.models.Sale;
    const sales = await Sale.find().sort({ createdAt: -1 });
    return NextResponse.json({ success: true, sales });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await dbConnect();
    const Sale = mongoose.models.Sale;
    const body = await req.json();
    const { action, saleId, clientId, items, statusType, localDate } = body;

    if (action === 'CHECKOUT') {
      // Doppelbuchungssperre: Kommt ein Bon aus der Warteschlange ein zweites Mal an
      // (z. B. weil die Antwort unterwegs verloren ging), geben wir den bereits
      // gebuchten Beleg zurück, statt ihn erneut anzulegen.
      if (clientId) {
        const existing = await Sale.findOne({ clientId });
        if (existing) {
          return NextResponse.json({ success: true, sale: existing, duplicate: true });
        }
      }

      const saleDate = localDate || new Date().toISOString().split('T')[0];
      
      let totalBrutto = 0;
      let totalNetto = 0;
      let totalVat = 0;

      items.forEach(item => {
        const price = parseFloat(item.priceAtSale) || 0;
        const quantity = parseInt(item.quantity) || 0;
        const vatRate = parseFloat(item.vatRateAtSale) || 0;

        const lineBrutto = price * quantity;
        const factor = 1 + (vatRate / 100);
        const lineNetto = lineBrutto / factor;
        const lineVat = lineBrutto - lineNetto;

        totalBrutto += lineBrutto;
        totalNetto += lineNetto;
        totalVat += lineVat;
      });

      const newSale = new Sale({
        items: items.map(i => ({
          productId: i.productId,
          name: i.name,
          quantity: parseInt(i.quantity),
          priceAtSale: parseFloat(i.priceAtSale),
          vatRateAtSale: parseFloat(i.vatRateAtSale)
        })),
        totalBrutto: Math.round(totalBrutto * 100) / 100,
        totalNetto: Math.round(totalNetto * 100) / 100,
        totalVat: Math.round(totalVat * 100) / 100,
        saleDate: saleDate,
        status: 'active',
        storno: false,
        clientId: clientId || null
      });

      await newSale.save();
      return NextResponse.json({ success: true, sale: newSale });
    }

    if (action === 'STORNO') {
      let updatedSale = null;

      if (saleId) {
        updatedSale = await Sale.findByIdAndUpdate(saleId, { storno: true }, { new: true });
      }
      // Fällt die Server-ID aus (Bon kam aus der Warteschlange), greift die Bon-Kennung.
      if (!updatedSale && clientId) {
        updatedSale = await Sale.findOneAndUpdate({ clientId }, { storno: true }, { new: true });
      }
      if (!updatedSale) {
        return NextResponse.json({ error: 'Beleg nicht gefunden' }, { status: 404 });
      }

      return NextResponse.json({ success: true, sale: updatedSale });
    }

    if (action === 'UPDATE_STATUS') {
      const today = localDate || new Date().toISOString().split('T')[0];
      await Sale.updateMany(
        { saleDate: today, status: 'active', storno: false },
        { $set: { status: statusType } }
      );
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Ungültige Aktion' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}