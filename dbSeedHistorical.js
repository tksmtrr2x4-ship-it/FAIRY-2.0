// dbSeedHistorical.js - [Direkt im Hauptverzeichnis "schul-weltladen-pos" speichern]
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ Fehler: MONGODB_URI fehlt in der .env.local");
  process.exit(1);
}

// Schemas & Modelle laden
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

// Artikelmengen laut PDF 1 (15.12.2025 - 31.01.2026, 21 Tage, Summe: 683,40 €)
const period1Quantities = {
  3: 2, 4: 9, 6: 1, 7: 1, 12: 33, 13: 4, 14: 11, 15: 16, 16: 76, 17: 150, 18: 13, 19: 20, 21: 103,
  24: 10, 25: 33, 26: 3, 27: 1, 28: 13, 29: 7, 33: 1, 34: 27, 35: 9, 36: 6, 37: 1, 38: 2, 41: 6,
  45: 3, 46: 2, 47: 16, 48: 16, 49: -22, 50: -23, 51: 2, 53: 37, 54: 5, 55: 3
};

// Artikelmengen laut PDF 2 (01.01.2026 - 12.03.2026, 15 Tage, Summe: 568,60 €)
const period2Quantities = {
  1: 13, 2: 1, 3: 2, 4: 2, 7: 4, 10: 1, 12: 37, 13: 9, 14: 32, 16: 17, 17: 78, 18: 4, 19: 25, 21: 12,
  24: 22, 25: 45, 28: 45, 29: 4, 34: 33, 35: 9, 36: 4, 41: 1, 45: 1, 47: 22, 48: 103, 49: -32, 50: -78,
  53: 54, 54: 4, 55: 7
};

// Hilfsfunktion zum Generieren von Schultagen (Samstag & Sonntag überspringen)
function getSchoolDays(startDate, daysCount) {
  const days = [];
  let current = new Date(startDate);
  while (days.length < daysCount) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Kein Wochenende
      days.push(current.toISOString().split('T')[0]);
    }
    current.setDate(current.getDate() + 1);
  }
  return days;
}

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log("Verbunden mit der Datenbank. Lösche alte Verkäufe...");
  await Sale.deleteMany({}); // Setzt die Verkaufshistorie zurück, um Duplikate zu vermeiden

  const products = await Product.find({});
  const prodMap = {};
  products.forEach(p => { prodMap[p.nr] = p; });

  // 1. ZEITRAUM 1: 21 Schultage ab dem 15.12.2025 generieren
  const period1Dates = getSchoolDays('2025-12-15', 21);
  console.log("Generiere 21 Schultage für Zeitraum 1...");
  
  for (let d = 0; d < 21; d++) {
    const dailyItems = [];
    let dailyBrutto = 0;
    let dailyNetto = 0;
    let dailyVat = 0;

    Object.keys(period1Quantities).forEach(nr => {
      const totalQty = period1Quantities[nr];
      // Wir teilen die Mengen auf die 21 Tage auf
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

          dailyBrutto += brutto;
          dailyNetto += netto;
          dailyVat += vat;

          dailyItems.push({
            productId: prod._id,
            name: prod.name,
            quantity: qty,
            priceAtSale: prod.basePrice,
            vatRateAtSale: prod.vatRate
          });
        }
      }
    });

    const newSale = new Sale({
      items: dailyItems,
      totalBrutto: Math.round(dailyBrutto * 100) / 100,
      totalNetto: Math.round(dailyNetto * 100) / 100,
      totalVat: Math.round(dailyVat * 100) / 100,
      saleDate: period1Dates[d],
      status: 'closed', // Bereits archivierte Altdaten
      storno: false
    });
    await newSale.save();
  }

  // 2. ZEITRAUM 2: 15 Schultage ab dem 05.01.2026 generieren
  const period2Dates = getSchoolDays('2026-01-05', 15);
  console.log("Generiere 15 Schultage für Zeitraum 2...");

  for (let d = 0; d < 15; d++) {
    const dailyItems = [];
    let dailyBrutto = 0;
    let dailyNetto = 0;
    let dailyVat = 0;

    Object.keys(period2Quantities).forEach(nr => {
      const totalQty = period2Quantities[nr];
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

          dailyBrutto += brutto;
          dailyNetto += netto;
          dailyVat += vat;

          dailyItems.push({
            productId: prod._id,
            name: prod.name,
            quantity: qty,
            priceAtSale: prod.basePrice,
            vatRateAtSale: prod.vatRate
          });
        }
      }
    });

    const newSale = new Sale({
      items: dailyItems,
      totalBrutto: Math.round(dailyBrutto * 100) / 100,
      totalNetto: Math.round(dailyNetto * 100) / 100,
      totalVat: Math.round(dailyVat * 100) / 100,
      saleDate: period2Dates[d],
      status: 'closed',
      storno: false
    });
    await newSale.save();
  }

  console.log("✅ Historische Verkaufsdaten erfolgreich eingespeist!");
  process.exit(0);
}

seed().catch(err => console.error(err));