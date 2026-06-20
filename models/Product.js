import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema({
  nr: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  group: { type: String, required: true },
  basePrice: { type: Number, required: true },
  vatRate: { type: Number, required: true, default: 19 },
  active: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.models.Product || mongoose.model('Product', ProductSchema);