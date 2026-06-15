import dbConnect from '@/lib/dbConnect';
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';

const SettingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true }
});

const Settings = mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);

export async function GET() {
  await dbConnect();
  try {
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
  await dbConnect();
  try {
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