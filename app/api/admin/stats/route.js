import dbConnect from '@/lib/dbConnect';
import { NextResponse } from 'next/server';

// Sicheres Laden des Modells im CommonJS-Format
const Sale = require('@/models/Sale');

export async function GET(req) {
  await dbConnect();
  try {
    const url = new URL(req.url);
    const quarter = url.searchParams.get('quarter');
    
    let query = { storno: false };

    if (quarter) {
      const year = quarter.split('-')[0];
      const q = quarter.split('-')[1];
      let startMonth, endMonth;

      if (q === 'Q1') { startMonth = '01'; endMonth = '03'; }
      else if (q === 'Q2') { startMonth = '04'; endMonth = '06'; }
      else if (q === 'Q3') { startMonth = '07'; endMonth = '09'; }
      else { startMonth = '10'; endMonth = '12'; }

      query.saleDate = { 
        $gte: `${year}-${startMonth}-01`, 
        $lte: `${year}-${endMonth}-31` 
      };
    } else {
      const today = new Date().toISOString().split('T')[0];
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