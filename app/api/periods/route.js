// app/api/periods/route.js - [Selbstheilende Perioden-API]
import dbConnect from '@/lib/dbConnect';
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    await dbConnect();
    const Period = mongoose.models.Period;
    
    let periods = await Period.find().sort({ startDate: 1 });
    
    // SELBSTHEILUNG: Falls die Liste leer ist, legen wir die 3 Standard-Zeiträume an.
    // Dies ist vollkommen sicher und berührt deine Verkaufsdaten auf dem Server nicht!
    if (periods.length === 0) {
      console.log("Perioden-Tabelle ist leer. Lege die Standard-Abrechnungszeiträume an...");
      const defaultPeriods = [
        { name: "Testphase", startDate: "2025-12-15", endDate: "2025-12-31" },
        { name: "1. Quartal (Q1)", startDate: "2026-01-01", endDate: "2026-03-12" },
        { name: "2. Quartal (Q2)", startDate: "2026-03-13", endDate: "2026-08-31" }
      ];
      await Period.insertMany(defaultPeriods);
      periods = await Period.find().sort({ startDate: 1 });
    }

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