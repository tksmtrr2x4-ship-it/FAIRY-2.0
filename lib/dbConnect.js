// lib/dbConnect.js - [Komplett abgesichert gegen synchrone Start-Abstürze]
import mongoose from 'mongoose';

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  const MONGODB_URI = process.env.MONGODB_URI;

  // Die Überprüfung wird erst im try-catch der API ausgeführt
  if (!MONGODB_URI) {
    throw new Error('Datenbank-Verbindungsstring (MONGODB_URI) fehlt in den Vercel-Umgebungsvariablen!');
  }

  if (cached.conn) {
    registerModels();
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongooseInstance) => {
      registerModels();
      return mongooseInstance;
    }).catch((err) => {
      cached.promise = null; // Cache bei Verbindungsfehler zurücksetzen
      throw err;
    });
  }
  
  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null; // Cache zurücksetzen
    throw err;
  }
  
  return cached.conn;
}

// Registriert alle Schemata global in Mongoose
function registerModels() {
  // 1. PRODUCT MODEL REGISTRIEREN
  if (!mongoose.models.Product) {
    const ProductSchema = new mongoose.Schema({
      nr: { type: Number, required: true, unique: true },
      name: { type: String, required: true },
      group: { type: String, required: true },
      basePrice: { type: Number, required: true },
      vatRate: { type: Number, required: true, default: 19 },
      active: { type: Boolean, default: true }
    }, { timestamps: true });
    mongoose.model('Product', ProductSchema);
    console.log("Global Product model registered.");
  }

  // 2. SALE MODEL REGISTRIEREN
  if (!mongoose.models.Sale) {
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
    mongoose.model('Sale', SaleSchema);
    console.log("Global Sale model registered.");
  }

  // 3. SETTINGS MODEL REGISTRIEREN
  if (!mongoose.models.Settings) {
    const SettingsSchema = new mongoose.Schema({
      key: { type: String, required: true, unique: true },
      value: { type: mongoose.Schema.Types.Mixed, required: true }
    });
    mongoose.model('Settings', SettingsSchema);
    console.log("Global Settings model registered.");
  }
}

export default dbConnect;