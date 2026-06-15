const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ Fehler: MONGODB_URI fehlt in der .env.local");
  process.exit(1);
}

const ProductSchema = new mongoose.Schema({
  nr: Number, name: String, group: String, basePrice: Number, vatRate: Number, active: Boolean
});
const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

const SaleSchema = new mongoose.Schema({
  items: [{
    productId: mongoose.Schema.Types.ObjectId,
    name: String, quantity: Number, priceAtSale: Number, vatRateAtSale: Number
  }],
  totalBrutto: Number, totalNetto: Number, totalVat: Number, status: String, storno: Boolean, saleDate: String
}, { timestamps: true });
const Sale = mongoose.models.Sale || mongoose.model('Sale', SaleSchema);

// 1. TESTPHASE (15.12.2025 - 31.01.2026, 21 Tage, Summe: 683,40 €)
const testphaseQuantities = {
  3: 2, 4: 9, 6: 1, 7: 1, 12: 33, 13: 4, 14: 11, 15: 16, 16: 76, 17: 150, 18: 13, 19: 20, 21: 103,
  24: 10, 25: 33, 26: 3, 27: 1, 28: 13, 29: 7, 33: 1, 34: 27, 35: 9, 36: 6, 37: 1, 38: 2, 41: 6,
  45: 3, 46: 2, 47: 16, 48: 16, 49: -22, 50: -23, 51: 2, 53: 37, 54: 5, 55: 3
};

// 2. 1. QUARTAL / Q1 (01.01.2026 - 12.03.2026, 15 Tage, Summe: 568,60 €)
const q1Quantities = {
  1: 13, 2: 1, 3: 2, 4: 2, 7: 4, 10: 1, 12: 37, 13: 9, 14: 32, 16: 17, 17: 78, 18: 4, 19: 25, 21: 12,
  24: 22, 25: 45, 28: 45, 29: 4, 34: 33, 35: 9, 36: 4, 41: 1, 45: 1, 47: 22, 48: 103, 49: -32, 50: -78,
  53: 54, 54: 4, 55: 7
};

// 3. 2. QUARTAL / Q2 (12.03.2026 - 11.06.2026, 15 Tage, Summe: 1021,60 €)
const q2Quantities = {
  2: 11, 4: 11, 5: 1, 6: 41, 7: 16, 8: 32, 9: 233, 10: 13, 12: 104, 13: 3, 15: 7, 16: 17, 17: 28, 
  21: 28, 22: 1, 25: 1, 26: 34, 27: 18, 28: 1, 30: 1, 33: 1, 40: 32, 41: 45, 42: 27, 43: 10, 45: 41, 
  46: 4, 47: 3, 48: 2
};

function getSchoolDays(startDate, daysCount) {
  const days = [];
  let current = new Date(startDate);
  while (days.length < daysCount) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) days.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return days;
}

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log("Verbunden mit der Datenbank. Setze Altdaten zurück...");
  await Sale.deleteMany({}); // Löscht alte Testverkäufe, damit nichts doppelt gezählt wird

  const products = await Product.find({});
  const prodMap = {};
  products.forEach(p => { prodMap[p.nr] = p; });

  // A. TESTPHASE SPEISEN
  const testphaseDates = getSchoolDays('2025-12-15', 21);
  for (let d = 0; d < 21; d++) {
    const dailyItems = [];
    let dailyBrutto = 0, dailyNetto = 0, dailyVat = 0;

    Object.keys(testphaseQuantities).forEach(nr => {
      const totalQty = testphaseQuantities[nr];
      const baseQty = Math.floor(totalQty / 21);
      const remainder = totalQty % 21;
      const qty = baseQty + (d < Math.abs(remainder) ? Math.sign(remainder) : 0);

      if (qty !== 0) {
        const prod = prodMap[nr];
        if (prod) {
          const brutto = prod.basePrice * qty;
          const factor = 1 + (prod.vatRate / 100);
          const netto = brutto / factor;
          const vat = brutto - netto;
          dailyBrutto += brutto; dailyNetto += netto; dailyVat += vat;

          dailyItems.push({
            productId: prod._id, name: prod.name, quantity: qty, priceAtSale: prod.basePrice, vatRateAtSale: prod.vatRate
          });
        }
      }
    });

    const newSale = new Sale({
      items: dailyItems,
      totalBrutto: Math.round(dailyBrutto * 100) / 100,
      totalNetto: Math.round(dailyNetto * 100) / 100,
      totalVat: Math.round(dailyVat * 100) / 100,
      saleDate: testphaseDates[d],
      status: 'testphase', // <--- Exakte Kennzeichnung für die Statistik
      storno: false
    });
    await newSale.save();
  }

  // B. 1. QUARTAL / Q1 SPEISEN
  const q1Dates = getSchoolDays('2026-01-05', 15);
  for (let d = 0; d < 15; d++) {
    const dailyItems = [];
    let dailyBrutto = 0, dailyNetto = 0, dailyVat = 0;

    Object.keys(q1Quantities).forEach(nr => {
      const totalQty = q1Quantities[nr];
      const baseQty = Math.floor(totalQty / 15);
      const remainder = totalQty % 15;
      const qty = baseQty + (d < Math.abs(remainder) ? Math.sign(remainder) : 0);

      if (qty !== 0) {
        const prod = prodMap[nr];
        if (prod) {
          const brutto = prod.basePrice * qty;
          const factor = 1 + (prod.vatRate / 100);
          const netto = brutto / factor;
          const vat = brutto - netto;
          dailyBrutto += brutto; dailyNetto += netto; dailyVat += vat;

          dailyItems.push({
            productId: prod._id, name: prod.name, quantity: qty, priceAtSale: prod.basePrice, vatRateAtSale: prod.vatRate
          });
        }
      }
    });

    const newSale = new Sale({
      items: dailyItems,
      totalBrutto: Math.round(dailyBrutto * 100) / 100,
      totalNetto: Math.round(dailyNetto * 100) / 100,
      totalVat: Math.round(dailyVat * 100) / 100,
      saleDate: q1Dates[d],
      status: 'q1', // <--- Exakte Kennzeichnung für die Statistik
      storno: false
    });
    await newSale.save();
  }

  // C. 2. QUARTAL / Q2 SPEISEN
  const q2Dates = getSchoolDays('2026-03-12', 15);
  for (let d = 0; d < 15; d++) {
    const dailyItems = [];
    let dailyBrutto = 0, dailyNetto = 0, dailyVat = 0;

    Object.keys(q2Quantities).forEach(nr => {
      const totalQty = q2Quantities[nr];
      const baseQty = Math.floor(totalQty / 15);
      const remainder = totalQty % 15;
      const qty = baseQty + (d < Math.abs(remainder) ? Math.sign(remainder) : 0);

      if (qty !== 0) {
        const prod = prodMap[nr];
        if (prod) {
          const brutto = prod.basePrice * qty;
          const factor = 1 + (prod.vatRate / 100);
          const netto = brutto / factor;
          const vat = brutto - netto;
          dailyBrutto += brutto; dailyNetto += netto; dailyVat += vat;

          dailyItems.push({
            productId: prod._id, name: prod.name, quantity: qty, priceAtSale: prod.basePrice, vatRateAtSale: prod.vatRate
          });
        }
      }
    });

    const newSale = new Sale({
      items: dailyItems,
      totalBrutto: Math.round(dailyBrutto * 100) / 100,
      totalNetto: Math.round(dailyNetto * 100) / 100,
      totalVat: Math.round(dailyVat * 100) / 100,
      saleDate: q2Dates[d],
      status: 'q2', // <--- Exakte Kennzeichnung für die Statistik
      storno: false
    });
    await newSale.save();
  }

  console.log("✅ Alle Altdaten (Testphase, Q1, Q2) wurden Cent-genau eingespeist!");
  process.exit(0);
}

seed().catch(err => console.error(err));