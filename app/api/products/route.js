import dbConnect from '@/lib/dbConnect';
import Product from '@/models/Product';
import { NextResponse } from 'next/server';

// Die originalen Daten aus dem PDF-Register
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
  { nr: 15, name: "Gepa Schokolade (40g)", group: "Lebensmittel", basePrice: 1.60, vatRate: 7 },
  { nr: 16, name: "Mini Schoko (10g)", group: "Lebensmittel", basePrice: 0.55, vatRate: 7 },
  { nr: 17, name: "Die gute Schokolade (100g; Vollmilch)", group: "Lebensmittel", basePrice: 1.80, vatRate: 7 },
  { nr: 18, name: "Die gute Schokolade (100g; Zartbitter)", group: "Lebensmittel", basePrice: 1.80, vatRate: 7 },
  { nr: 20, name: "Tartufo", group: "Lebensmittel", basePrice: 0.80, vatRate: 7 },
  { nr: 21, name: "ganz kleine Schokis", group: "Lebensmittel", basePrice: 0.15, vatRate: 7 },
  { nr: 22, name: "Mascobado Schokolade", group: "Lebensmittel", basePrice: 0.60, vatRate: 7 },
  { nr: 23, name: "Kokosriegel", group: "Lebensmittel", basePrice: 1.50, vatRate: 7 },
  { nr: 24, name: "Barrita-Sesamriegel", group: "Lebensmittel", basePrice: 0.50, vatRate: 7 },
  { nr: 25, name: "Pfefferminzdrops", group: "Lebensmittel", basePrice: 0.55, vatRate: 7 },
  { nr: 26, name: "Lemonherzen, Schoko-Orangen-Taler", group: "Lebensmittel", basePrice: 2.50, vatRate: 7 },
  { nr: 27, name: "Cookies", group: "Lebensmittel", basePrice: 3.80, vatRate: 7 },
  { nr: 28, name: "Dobiltos", group: "Lebensmittel", basePrice: 2.00, vatRate: 7 },
  { nr: 29, name: "Popquins", group: "Lebensmittel", basePrice: 1.80, vatRate: 7 },
  { nr: 30, name: "Kakao Amaribe (125g.)", group: "Lebensmittel", basePrice: 3.80, vatRate: 7 },
  { nr: 31, name: "Mascobado-Zucker 1kg", group: "Lebensmittel", basePrice: 8.00, vatRate: 7 },
  { nr: 32, name: "Vanille Schoten", group: "Lebensmittel", basePrice: 10.00, vatRate: 7 },
  { nr: 33, name: "Faires Pfund Kakao", group: "Lebensmittel", basePrice: 6.00, vatRate: 7 },
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
  { nr: 46, name: "Cup StU", group: "Sonstige", basePrice: 1.50, vatRate: 19 },
  { nr: 47, name: "Vesperdose", group: "Sonstige", basePrice: 10.00, vatRate: 19 },
  { nr: 48, name: "Glaspfand-Einnahme", group: "Sonstige", basePrice: 1.00, vatRate: 19 },
  { nr: 49, name: "Flaschen Pfand-Einnahme (Limo & Seezüngle)", group: "Sonstige", basePrice: 0.20, vatRate: 19 },
  { nr: 50, name: "Glaspfand-Ausgabe", group: "Sonstige", basePrice: -1.00, vatRate: 19 },
  { nr: 51, name: "Flaschen Pfand-Ausgabe (Limo & Seezüngle)", group: "Sonstige", basePrice: -0.20, vatRate: 19 },
  { nr: 52, name: "Porridge (3 Toppings)", group: "Lebensmittel", basePrice: 1.50, vatRate: 7 },
  { nr: 53, name: "Nikolaus", group: "Lebensmittel", basePrice: 2.80, vatRate: 7 },
  { nr: 54, name: "Limo", group: "Lebensmittel", basePrice: 1.50, vatRate: 19 },
  { nr: 55, name: "College-Block (80 Blatt)", group: "Schreibwaren", basePrice: 1.50, vatRate: 19 },
  { nr: 56, name: "Crossita", group: "Lebensmittel", basePrice: 1.50, vatRate: 7 },
  { nr: 57, name: "Mandel Tonka", group: "Lebensmittel", basePrice: 1.00, vatRate: 7 },
  { nr: 58, name: "Fair Bite", group: "Lebensmittel", basePrice: 1.60, vatRate: 7 }
];

export async function GET() {
  await dbConnect();
  try {
    // 1. Suche nach allen aktiven Produkten in der Datenbank
    let products = await Product.find({ active: true }).sort({ nr: 1 });

    // 2. AUTOMATISCHES ERST-SEEDING: Wenn die DB leer ist, füttern wir sie sofort mit dem PDF-Stand
    if (products.length === 0) {
      console.log("Datenbank ist leer. Speise automatische PDF-Produkte ein...");
      await Product.insertMany(initialProducts);
      // Erneut abfragen, um die gerade geschriebenen Daten zurückzugeben
      products = await Product.find({ active: true }).sort({ nr: 1 });
    }

    return NextResponse.json({ products });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 3. Ein neues Produkt manuell über das Dashboard hinzufügen
export async function POST(req) {
  await dbConnect();
  try {
    const body = await req.json();
    const { name, group, basePrice, vatRate } = body;

    const lastProduct = await Product.findOne().sort({ nr: -1 });
    const nextNr = lastProduct ? lastProduct.nr + 1 : 1;

    const newProduct = new Product({
      nr: nextNr,
      name,
      group,
      basePrice: parseFloat(basePrice),
      vatRate: parseInt(vatRate) || 19,
      active: true
    });

    await newProduct.save();
    return NextResponse.json({ success: true, product: newProduct });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}