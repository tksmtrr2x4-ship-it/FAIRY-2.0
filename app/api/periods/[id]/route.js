// app/api/periods/[id]/route.js
import dbConnect from '@/lib/dbConnect';
import { NextResponse } from 'next/server';

const Period = require('@/models/Period');

export async function DELETE(req, { params }) {
  try {
    await dbConnect();
    const { id } = params;

    await Period.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}