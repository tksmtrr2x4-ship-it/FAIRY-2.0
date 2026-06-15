import dbConnect from '@/lib/dbConnect';
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';

export async function PUT(req, { params }) {
  try {
    await dbConnect();
    const Product = mongoose.models.Product;
    const { id } = params;
    const { price, name, group, vatRate } = await req.json();

    const updateFields = {};
    if (price !== undefined) updateFields.basePrice = parseFloat(price);
    if (name !== undefined) updateFields.name = name;
    if (group !== undefined) updateFields.group = group;
    if (vatRate !== undefined) updateFields.vatRate = parseInt(vatRate);

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
    const { id } = params;
    const deletedProduct = await Product.findByIdAndUpdate(id, { active: false }, { new: true });
    return NextResponse.json({ success: true, product: deletedProduct });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}