import dbConnect from '@/lib/dbConnect';
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    await dbConnect();
    const Period = mongoose.models.Period;
    const periods = await Period.find().sort({ startDate: 1 });
    return NextResponse.json({ success: true, periods });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await dbConnect();
    const Period = mongoose.models.Period;
    const { name, startDate, endDate } = await req.json();

    const newPeriod = new Period({ name, startDate, endDate });
    await newPeriod.save();

    return NextResponse.json({ success: true, period: newPeriod });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}