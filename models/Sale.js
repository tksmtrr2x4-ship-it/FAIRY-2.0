const mongoose = require('mongoose');

const SaleSchema = new mongoose.Schema({
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    priceAtSale: { type: Number, required: true },
    vatRateAtSale: { type: Number, required: true }
  }],
  totalBrutto: { type: Number, required: true },
  totalNetto: { type: Number, required: true },
  totalVat: { type: Number, required: true },
  status: { type: String, default: 'active' },
  storno: { type: Boolean, default: false },
  saleDate: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.models.Sale || mongoose.model('Sale', SaleSchema);