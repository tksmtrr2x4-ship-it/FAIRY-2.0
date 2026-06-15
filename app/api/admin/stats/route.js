import dbConnect from '@/lib/dbConnect';
import { NextResponse } from 'next/server';

const Sale = require('@/models/Sale');

export async function GET(req) {
  await dbConnect();
  try {
    const url = new URL(req.url);
    const quarter = url.searchParams.get('quarter'); // 'testphase', 'q1', 'q2'
    const dateParam = url.searchParams.get('date');  // Lokales Datum im Format YYYY-MM-DD
    
    let query = { storno: false };

    if (quarter) {
      query.status = quarter;
    } else {
      // Priorisiert das deutsche Datum des Kassen-Browsers (verhindert Vercel-USA-Zeitzonen-Fehler)
      const today = dateParam || new Date().toISOString().split('T')[0];
      query.saleDate = today;
      query.status = 'active';
    }

    const sales = await Sale.find(query);
    
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