import mongoose from 'mongoose';

const PeriodSchema = new mongoose.Schema({
  name: { type: String, required: true },
  startDate: { type: String, required: true },
  endDate: { type: String, required: true }
}, { timestamps: true });

export default mongoose.models.Period || mongoose.model('Period', PeriodSchema);