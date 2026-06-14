import dbConnect from '@/lib/dbConnect';
import Product from '@/models/Product';
import { NextResponse } from 'next/server';

export async function PUT(req, { params }) {
  await dbConnect();
  try {
    const { id } = params;
    const { price } = await req.json();
    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      { basePrice: price },
      { new: true }
    );
    return NextResponse.json({ success: true, product: updatedProduct });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}