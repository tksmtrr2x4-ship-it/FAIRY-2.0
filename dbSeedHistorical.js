// dbSeedHistorical.js - [Master-Skript zur vollständigen Bereinigung und Einspeisung]
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ Fehler: MONGODB_URI fehlt in der .env.local");
  process.exit(1);
}

// Schemas laden
const ProductSchema = new mongoose.Schema({
  nr: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  group: { type: String, required: true },
  basePrice: { type: Number, required: true },
  vatRate: { type: Number, required: true, default: 19 },
  active: { type: Boolean, default: true }
}, { timestamps: true });
const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

const SaleSchema = new mongoose.Schema({
  items: [{
    productId: mongoose.Schema.Types.ObjectId,
    name: String, quantity: Number, priceAtSale: Number, vatRateAtSale: Number
  }],
  totalBrutto: Number, totalNetto: Number, totalVat: Number, status: String, storno: Boolean, saleDate: String
}, { timestamps: true });
const Sale = mongoose.models.Sale || mongoose.model('Sale', SaleSchema);

const initialProducts = [
  { nr: 1, name: "Himbeeren", group: "Unverpackt; Lebensmittel", basePrice: 2.50, vatRate: 7 },
  { nr: 2, name: "Studentenfutter", group: "Unverpackt; Lebensmittel", basePrice: 1.00, vatRate: 7 },
  { nr: 3, name: "Cashews gesalzen", group: "Unverpackt; Lebensmittel", basePrice: 1.50, vatRate: 7 },
  { nr: 4, name: "Nussmix", group: "Unverpackt; Lebensmittel", basePrice: 2.00, vatRate: 7 },
  { nr: 5, name: "Balints Dream(mit Bananen, Kokoschips)", group: "Unverpackt; Lebensmittel", basePrice: 2.00, vatRate: 7 },
  { nr: 6, name: "Obstsalat", group: "Unverpackt; Lebensmittel", basePrice: 2.00, vatRate: 7 },
  { nr: 7, name: "Bananenchips", group: "Unverpackt; Lebensmittel", basePrice: 1.00, vatRate: 7 },
  { nr: 8, name: "Kokossmiles", group: "Unverpackt; Lebensmittel", basePrice: 1.00, vatRate: 7 },
  { nr: 9, name: "Schokolinsen", group: "Unverpackt; Lebensmittel", basePrice: 1.00, vatRate: 7 },
  { nr: 10, name: "Macadamia gesalzen", group: "Unverpackt; Lebensmittel", basePrice: 2.00, vatRate: 7 },
  { nr: 11, name: "Tamari-Cashews", group: "Unverpackt; Lebensmittel", basePrice: 2.00, vatRate: 7 },
  { nr: 12, name: "Gummibärchen, Fruchtfritte, vegane Beeren…", group: "Unverpackt; Lebensmittel", basePrice: 1.00, vatRate: 7 },
  { nr: 13, name: "Schokolade aller Sorten", group: "Unverpackt; Lebensmittel", basePrice: 1.00, vatRate: 7 },
  { nr: 14, name: "Gepa Schokoriegel", group: "Lebensmittel", basePrice: 1.60, vatRate: 7 },
  { nr: 15, name: "Weihnachtsschokolade Gepa (40g)", group: "Lebensmittel", basePrice: 1.70, vatRate: 7 },
  { nr: 16, name: "Mini Schoko (10g)", group: "Lebensmittel", basePrice: 0.55, vatRate: 7 },
  { nr: 17, name: "Die gute Schokolade (100g; Vollmilch)", group: "Lebensmittel", basePrice: 1.80, vatRate: 7 },
  { nr: 18, name: "Die gute Schokolade (100g; Zartbitter)", group: "Lebensmittel", basePrice: 1.60, vatRate: 7 },
  { nr: 19, name: "Gepa Schokolade (40g; Erdbeere)", group: "Lebensmittel", basePrice: 0.80, vatRate: 7 },
  { nr: 20, name: "Tartufo", group: "Lebensmittel", basePrice: 0.15, vatRate: 7 },
  { nr: 21, name: "ganz kleine Schokis", group: "Lebensmittel", basePrice: 0.15, vatRate: 7 },
  { nr: 22, name: "vegane Schokolade", group: "Lebensmittel", basePrice: 2.80, vatRate: 7 },
  { nr: 23, name: "Kokosriegel", group: "Lebensmittel", basePrice: 1.50, vatRate: 7 },
  { nr: 24, name: "Barrita-Sesamriegel", group: "Lebensmittel", basePrice: 0.50, vatRate: 7 },
  { nr: 25, name: "Pfefferminzdrops", group: "Lebensmittel", basePrice: 0.55, vatRate: 7 },
  { nr: 26, name: "Lemonherzen, Schoko-Orangen-Taler", group: "Lebensmittel", basePrice: 2.50, vatRate: 7 },
  { nr: 27, name: "Cookies", group: "Lebensmittel", basePrice: 3.80, vatRate: 7 },
  { nr: 28, name: "Dobiltos", group: "Lebensmittel", basePrice: 2.00, vatRate: 7 },
  { nr: 29, name: "Popquins", group: "Lebensmittel", basePrice: 3.00, vatRate: 7 },
  { nr: 30, name: "Kakao Amaribe (125g.)", group: "Lebensmittel", basePrice: 3.80, vatRate: 7 },
  { nr: 31, name: "Mascobado-Zucker 1kg", group: "Lebensmittel", basePrice: 8.00, vatRate: 7 },
  { nr: 32, name: "Vanille Schoten", group: "Lebensmittel", basePrice: 10.00, vatRate: 7 },
  { nr: 33, name: "Faires Pfund Kakao", group: "Lebensmittel", basePrice: 5.00, vatRate: 7 },
  { nr: 34, name: "A4 Heft (Einfach)", group: "Schreibwaren", basePrice: 0.70, vatRate: 19 },
  { nr: 35, name: "A4 heft (Doppel)", group: "Schreibwaren", basePrice: 0.90, vatRate: 19 },
  { nr: 36, name: "A4 Schnellhefter", group: "Schreibwaren", basePrice: 0.70, vatRate: 19 },
  { nr: 37, name: "A4 Spiralblock", group: "Schreibwaren", basePrice: 1.50, vatRate: 19 },
  { nr: 38, name: "A4 Ringbuchblätter", group: "Schreibwaren", basePrice: 1.30, vatRate: 19 },
  { nr: 39, name: "A5 Heft", group: "Schreibwaren", basePrice: 0.50, vatRate: 19 },
  { nr: 40, name: "A4 Register", group: "Schreibwaren", basePrice: 1.80, vatRate: 19 },
  { nr: 41, name: "A4 Umschlag", group: "Schreibwaren", basePrice: 0.70, vatRate: 19 },
  { nr: 42, name: "Lyra-Buntstift", group: "Schreibwaren", basePrice: 1.30, vatRate: 19 },
  { nr: 43, name: "Klebestift", group: "Schreibwaren", basePrice: 2.00, vatRate: 19 },
  { nr: 44, name: "Korrekturroller", group: "Schreibwaren", basePrice: 3.50, vatRate: 19 },
  { nr: 45, name: "Kerze", group: "Sonstige", basePrice: 6.00, vatRate: 19 },
  { nr: 59, name: "Cup StU", group: "Sonstige", basePrice: 1.50, vatRate: 19 },
  { nr: 46, name: "Vesperdose", group: "Sonstige", basePrice: 10.00, vatRate: 19 },
  { nr: 47, name: "Glaspfand-Einnahme", group: "Sonstige", basePrice: 1.00, vatRate: 19 },
  { nr: 48, name: "Flaschen Pfand-Einnahme (Limo & Seezüngle)", group: "Sonstige", basePrice: 0.20, vatRate: 19 },
  { nr: 49, name: "Glaspfand-Ausgabe", group: "Sonstige", basePrice: -1.00, vatRate: 19 },
  { nr: 50, name: "Flaschen Pfand-Ausgabe (Limo & Seezüngle)", group: "Sonstige", basePrice: -0.20, vatRate: 19 },
  { nr: 51, name: "Porridge (3 Toppings)", group: "Lebensmittel", basePrice: 1.50, vatRate: 7 },
  { nr: 52, name: "Nikolaus", group: "Lebensmittel", basePrice: 2.80, vatRate: 7 },
  { nr: 53, name: "Limo", group: "Lebensmittel", basePrice: 1.50, vatRate: 19 },
  { nr: 60, name: "College-Block (80 Blatt)", group: "Schreibwaren", basePrice: 1.50, vatRate: 19 },
  { nr: 61, name: "Crossita", group: "Lebensmittel", basePrice: 1.50, vatRate: 7 },
  { nr: 62, name: "Mandel Tonka", group: "Lebensmittel", basePrice: 1.00, vatRate: 7 },
  { nr: 63, name: "Fair Bite", group: "Lebensmittel", basePrice: 1.60, vatRate: 7 }
];

const testphaseQuantities = {
  3: 2, 4: 9, 6: 1, 7: 1, 12: 33, 13: 4, 14: 11, 15: 16, 16: 76, 17: 150, 18: 13, 19: 20, 21: 103,
  24: 10, 25: 33, 26: 3, 27: 1, 28: 13, 29: 7, 33: 1, 34: 27, 35: 9, 36: 6, 37: 1, 38: 2, 41: 6,
  45: 3, 59: 3, 46: 2, 47: 16, 48: 16, 49: -22, 50: -23, 51: 2, 53: 37, 60: 5, 56: 3
};

const q1Quantities = {
  1: 13, 2: 1, 3: 2, 4: 2, 7: 4, 10: 1, 12: 37, 13: 9, 14: 32, 16: 17, 17: 78, 18: 4, 19: 25, 21: 12,
  24: 22, 25: 45, 28: 45, 29: 4, 34: 33, 35: 9, 36: 4, 41: 1, 59: 1, 47: 22, 48: 103, 49: -32, 50: -78,
  53: 54, 60: 4, 56: 7
};

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
  console.log("WICHTIG: Bereinige alte Datenbank-Karten und beschädigte Indizes...");
  
  // WIRFT ALTE TABELLEN UND KAPUTTE INDIZES VOLLSTÄNDIG RAUS!
  try { await Product.collection.drop(); } catch (e) {}
  try { await Sale.collection.drop(); } catch (e) {}

  console.log("Speise alle 58 Produkte mit korrekten Artikelnummern ein...");
  const insertedProducts = await Product.insertMany(initialProducts);

  const prodMap = {};
  insertedProducts.forEach(p => { prodMap[p.nr] = p; });

  // A. TESTPHASE SPEISEN (10 Tage)
  const testphaseDates = getSchoolDays('2025-12-15', 10);
  for (let d = 0; d < 10; d++) {
    const dailyItems = [];
    let dailyBrutto = 0, dailyNetto = 0, dailyVat = 0;

    Object.keys(testphaseQuantities).forEach(nr => {
      const totalQty = testphaseQuantities[nr];
      const baseQty = Math.floor(totalQty / 10);
      const remainder = totalQty % 10;
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
      status: 'closed',
      storno: false
    });
    await newSale.save();
  }

  // B. Q1 SPEISEN (15 Tage)
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
      status: 'closed',
      storno: false
    });
    await newSale.save();
  }

  // C. Q2 SPEISEN (15 Tage)
  const q2Dates = getSchoolDays('2026-03-13', 15);
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
      status: 'closed',
      storno: false
    });
    await newSale.save();
  }

  console.log("✅ Datenbank komplett gesäubert und alle Produkte & Altdaten fehlerfrei neu eingespeist!");
  process.exit(0);
}

seed().catch(err => console.error(err));