import dbConnect from '@/lib/dbConnect';
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';

const Sale = mongoose.models.Sale;

export async function GET(req) {
  try {
    await dbConnect();
    const url = new URL(req.url);
    const quarter = url.searchParams.get('quarter'); // 'testphase', 'q1', 'q2'
    const dateParam = url.searchParams.get('date');
    
    let query = { storno: false };

    if (quarter) {
      if (quarter === 'testphase') {
        query.saleDate = { $gte: '2025-12-15', $lte: '2025-12-31' };
      } else if (quarter === 'q1') {
        query.saleDate = { $gte: '2026-01-01', $lte: '2026-03-12' };
      } else if (quarter === 'q2') {
        // Q2 bis zum Ende des Schuljahres verlängert, um Live-Käufe zu erfassen
        query.saleDate = { $gte: '2026-03-13', $lte: '2026-08-31' };
      }
    } else {
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