import dbConnect from '@/lib/dbConnect';
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    await dbConnect();
    const Settings = mongoose.models.Settings;
    let config = await Settings.findOne({ key: 'siteConfig' });
    if (!config) {
      config = new Settings({ 
        key: 'siteConfig', 
        value: { bannerActive: false, bannerMessage: 'Willkommen!', maintenanceActive: false } 
      });
      await config.save();
    }
    return NextResponse.json({ success: true, settings: config.value });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await dbConnect();
    const Settings = mongoose.models.Settings;
    const body = await req.json();
    const { bannerActive, bannerMessage, maintenanceActive } = body;

    const updated = await Settings.findOneAndUpdate(
      { key: 'siteConfig' },
      { value: { bannerActive, bannerMessage, maintenanceActive } },
      { new: true, upsert: true }
    );

    return NextResponse.json({ success: true, settings: updated.value });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}