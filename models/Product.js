import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema({
  nr: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  group: { type: String, required: true, enum: ['Unverpackt; Lebensmittel', 'Lebensmittel', 'Schreibwaren', 'Sonstige'] },
  basePrice: { type: Number, required: true }, // Aktueller Standardpreis
  quarterlyPrices: [{
    quarter: { type: String, required: true }, // z.B. "2026-Q1", "2026-Q2"
    price: { type: Number, required: true }
  }],
  vatRate: { type: Number, required: true, default: 19 }, // 19% oder 7%
  active: { type: Boolean, default: true } // Soft-Delete
}, { timestamps: true });

export default mongoose.models.Product || mongoose.model('Product', ProductSchema);