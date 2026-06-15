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
    let banner = await Settings.findOne({ key: 'actionBanner' });
    if (!banner) {
      banner = new Settings({ key: 'actionBanner', value: { active: false, message: 'Willkommen im Weltladen St. Ursula!' } });
      await banner.save();
    }
    return NextResponse.json({ success: true, settings: banner.value });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  await dbConnect();
  try {
    const body = await req.json();
    const { active, message } = body;

    const updated = await Settings.findOneAndUpdate(
      { key: 'actionBanner' },
      { value: { active, message } },
      { new: true, upsert: true }
    );

    return NextResponse.json({ success: true, settings: updated.value });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}