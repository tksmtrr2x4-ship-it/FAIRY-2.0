import dbConnect from '@/lib/dbConnect';
import Sale from '@/models/Sale';
import { NextResponse } from 'next/server';

export async function POST(req) {
  await dbConnect();
  try {
    const body = await req.json();
    const { action, saleId, items, statusType } = body;

    // 1. NEUER VERKAUF ABSCHLIESSEN (CHECKOUT)
    if (action === 'CHECKOUT') {
      const today = new Date().toISOString().split('T')[0];
      
      let totalBrutto = 0;
      let totalNetto = 0;
      let totalVat = 0;

      // Mathematisch präzise Netto- und MwSt.-Berechnung pro Posten
      items.forEach(item => {
        const lineBrutto = item.priceAtSale * item.quantity;
        const factor = 1 + (item.vatRateAtSale / 100);
        const lineNetto = lineBrutto / factor;
        const lineVat = lineBrutto - lineNetto;

        totalBrutto += lineBrutto;
        totalNetto += lineNetto;
        totalVat += lineVat;
      });

      const newSale = new Sale({
        items,
        totalBrutto: Math.round(totalBrutto * 100) / 100,
        totalNetto: Math.round(totalNetto * 100) / 100,
        totalVat: Math.round(totalVat * 100) / 100,
        saleDate: today,
        status: 'active',
        storno: false
      });

      await newSale.save();
      return NextResponse.json({ success: true, sale: newSale });
    }

    // 2. STORNO-ABWICKLUNG
    if (action === 'STORNO') {
      const updatedSale = await Sale.findByIdAndUpdate(
        saleId, 
        { storno: true }, 
        { new: true }
      );
      return NextResponse.json({ success: true, sale: updatedSale });
    }

    // 3. STATUS-UPDATE (PAUSEN- & KASSENSCHLUSS)
    if (action === 'UPDATE_STATUS') {
      const today = new Date().toISOString().split('T')[0];
      
      // Setzt alle noch offenen Verkäufe von heute auf den archivierten Status
      await Sale.updateMany(
        { saleDate: today, status: 'active', storno: false },
        { $set: { status: statusType } }
      );

      return NextResponse.json({ success: true, message: `Status auf ${statusType} gesetzt.` });
    }

    return NextResponse.json({ error: 'Ungültige Aktion' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}