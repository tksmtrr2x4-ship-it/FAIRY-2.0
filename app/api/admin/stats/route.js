import dbConnect from '@/lib/dbConnect';
import Sale from '@/models/Sale';
import { NextResponse } from 'next/server';

export async function GET() {
  await dbConnect();
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Wir filtern nur die heutigen Verkäufe, die aktiv und nicht storniert sind
    const sales = await Sale.find({ saleDate: today, status: 'active', storno: false });
    
    let totalRevenue = 0;
    let totalNetto = 0;
    let totalVat = 0;
    const productSalesMap = {};

    sales.forEach(sale => {
      totalRevenue += sale.totalBrutto;
      totalNetto += sale.totalNetto;
      totalVat += sale.totalVat;

      sale.items.forEach(item => {
        if (!productSalesMap[item.name]) {
          productSalesMap[item.name] = 0;
        }
        productSalesMap[item.name] += item.quantity;
      });
    });

    const bestSellers = Object.keys(productSalesMap).map(name => ({
      name,
      totalSold: productSalesMap[name]
    })).sort((a, b) => b.totalSold - a.totalSold).slice(0, 5);

    return NextResponse.json({
      success: true,
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalNetto: Math.round(totalNetto * 100) / 100,
        totalVat: Math.round(totalVat * 100) / 100,
        salesCount: sales.length
      },
      bestSellers
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}