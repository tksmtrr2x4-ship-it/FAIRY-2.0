import dbConnect from '@/lib/dbConnect';
import rawSale from '@/models/Sale';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const Sale = rawSale.default || rawSale;

export async function GET() {
  try {
    await dbConnect();
    const sales = await Sale.find().sort({ createdAt: -1 });
    return NextResponse.json({ success: true, sales });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json();
    const { action, saleId, items, statusType, localDate } = body;

    if (action === 'CHECKOUT') {
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
        storno: false
      });

      await newSale.save();
      return NextResponse.json({ success: true, sale: newSale });
    }

    if (action === 'STORNO') {
      const updatedSale = await Sale.findByIdAndUpdate(
        saleId, 
        { storno: true }, 
        { new: true }
      );
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