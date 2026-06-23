import dbConnect from '@/lib/dbConnect';
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req) {
  try {
    await dbConnect();
    const Sale = mongoose.models.Sale;
    const url = new URL(req.url);
    
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const dateParam = url.searchParams.get('date');

    let query = { storno: false };

    if (startDate && endDate) {
      query.saleDate = { $gte: startDate, $lte: endDate };
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