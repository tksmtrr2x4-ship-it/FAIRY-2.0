import dbConnect from '@/lib/dbConnect';
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function PUT(req, { params }) {
  try {
    await dbConnect();
    const Product = mongoose.models.Product;
    const { id } = await params;
    const { price, name, group, vatRate, stock, minStock } = await req.json();

    const updateFields = {};
    if (price !== undefined) updateFields.basePrice = parseFloat(price);
    if (name !== undefined) updateFields.name = name;
    if (group !== undefined) updateFields.group = group;
    if (vatRate !== undefined) updateFields.vatRate = parseInt(vatRate);

    // Leeres Feld bedeutet ausdrücklich "nicht gepflegt", nicht "null Stück".
    if (stock !== undefined) {
      updateFields.stock = stock === '' || stock === null ? null : parseInt(stock);
    }
    if (minStock !== undefined) {
      updateFields.minStock = minStock === '' || minStock === null ? null : parseInt(minStock);
    }

    const updatedProduct = await Product.findByIdAndUpdate(id, updateFields, { new: true });
    return NextResponse.json({ success: true, product: updatedProduct });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    await dbConnect();
    const Product = mongoose.models.Product;
    const { id } = await params;

    // Kein echtes Löschen: Der Datensatz bleibt erhalten und wird nur inaktiv
    // gesetzt. GET /api/products filtert ohnehin auf active != false, der
    // Artikel verschwindet also aus Kasse und Verzeichnis - die Verkaufshistorie
    // bleibt vollständig nachvollziehbar.
    const archived = await Product.findByIdAndUpdate(id, { active: false }, { new: true });
    if (!archived) {
      return NextResponse.json({ error: 'Produkt nicht gefunden' }, { status: 404 });
    }

    return NextResponse.json({ success: true, product: archived });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}