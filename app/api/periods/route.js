import dbConnect from '@/lib/dbConnect';
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';

// REINER LESEZUGRIFF: Liest nur aus deiner Live-MongoDB (Kein Seeding mehr!)
export async function GET() {
  try {
    await dbConnect();
    const Product = mongoose.models.Product;
    const products = await Product.find({ active: { $ne: false } }).sort({ nr: 1 });
    return NextResponse.json({ products });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Erstellen eines neuen Artikels (Ohne alte Daten zu berühren)
export async function POST(req) {
  try {
    await dbConnect();
    const Product = mongoose.models.Product;
    const body = await req.json();
    const { name, group, basePrice, vatRate } = body;

    // KORRIGIERT: 'await' statt 'asycn' Buchstabendreher!
    const lastProduct = await Product.findOne().sort({ nr: -1 });
    const nextNr = lastProduct ? lastProduct.nr + 1 : 1;

    const newProduct = new Product({
      nr: nextNr,
      name,
      group,
      basePrice: parseFloat(basePrice),
      vatRate: parseInt(vatRate) || 19,
      active: true
    });

    await newProduct.save();
    return NextResponse.json({ success: true, product: newProduct });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}