'use client';
import React, { useState, useEffect } from 'react';

export default function PosInterface() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [lastSaleId, setLastSaleId] = useState(null);
  const [liveTime, setLiveTime] = useState('');

  // Live-Uhrzeit initialisieren
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setLiveTime(now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Produkte laden
  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        if (data.products) setProducts(data.products);
      })
      .catch(err => console.error("API-Verbindungsfehler:", err));
  }, []);

  const addToCart = (product) => {
    const exists = cart.find(item => item.id === product._id);
    if (exists) {
      setCart(cart.map(item => item.id === product._id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, { 
        id: product._id, 
        name: product.name, 
        priceAtSale: product.basePrice, 
        vatRateAtSale: product.vatRate, 
        quantity: 1 
      }]);
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    const res = await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'CHECKOUT', items: cart })
    });
    const data = await res.json();
    if (data.success) {
      setLastSaleId(data.sale._id);
      setCart([]);
    }
  };

  const handleStorno = async () => {
    if (!lastSaleId) return;
    const res = await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'STORNO', saleId: lastSaleId })
    });
    const data = await res.json();
    if (data.success) {
      alert("Letzter Verkauf wurde storniert.");
      setLastSaleId(null);
    }
  };

  const handlePhaseChange = async (phase) => {
    const res = await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'UPDATE_STATUS', statusType: phase })
    });
    const data = await res.json();
    if (data.success) {
      alert(`Phase '${phase}' wurde erfolgreich archiviert.`);
    }
  };

  const totalCartPrice = cart.reduce((acc, item) => acc + (item.priceAtSale * item.quantity), 0);

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] font-sans antialiased flex flex-col selection:bg-[#0D2B45] selection:text-white">
      {/* Premium Apple Navigation Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/75 border-b border-gray-200/50 px-8 py-4 flex justify-between items-center transition-all duration-300">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#0D2B45]">Weltladen St. Ursula</h1>
            <p className="text-xs text-gray-400 font-medium tracking-wide">FAIRTRADE SCHÜLERFIRMA • VILLINGEN</p>
          </div>
          <div className="h-6 w-px bg-gray-200" />
          <div className="text-sm font-semibold text-[#E6AF2E] bg-[#E6AF2E]/10 px-3 py-1 rounded-full flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#E6AF2E] animate-pulse" />
            Live-Kasse
          </div>
        </div>

        {/* Live Uhrzeit & Datum */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-sm font-bold text-gray-800 font-mono tracking-widest">{liveTime || '00:00:00'}</span>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
              {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' })}
            </p>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-12 gap-6 p-8">
        
        {/* Katalog */}
        <main className="col-span-8 flex flex-col gap-6">
          {/* Minimalist Search Box */}
          <div className="relative shadow-sm rounded-2xl">
            <input 
              type="text" 
              placeholder="Artikel suchen..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-6 py-4 rounded-2xl border border-gray-200 bg-white text-base focus:outline-none focus:ring-4 focus:ring-[#0D2B45]/10 focus:border-[#0D2B45] transition-all duration-300 shadow-sm font-medium placeholder-gray-400"
            />
          </div>

          {products.length === 0 ? (
            <div className="flex-1 bg-white border border-gray-100 rounded-3xl p-12 flex flex-col items-center justify-center text-center shadow-sm">
              <div className="h-12 w-12 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mb-4 text-xl">⚠️</div>
              <h3 className="text-lg font-bold text-[#0D2B45]">Keine Produkte geladen</h3>
              <p className="text-sm text-gray-400 max-w-sm mt-2 font-medium">
                Bitte stelle sicher, dass du deine <span className="font-mono bg-gray-100 px-1 py-0.5 rounded">MONGODB_URI</span> in den Vercel-Umgebungsvariablen hinterlegt hast.
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto grid grid-cols-3 gap-4 pr-2 max-h-[calc(100vh-240px)]">
              {products
                .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
                .map(product => (
                  <button
                    key={product._id}
                    onClick={() => addToCart(product)}
                    className="p-5 bg-white border border-gray-100/80 hover:border-[#0D2B45] rounded-3xl shadow-sm hover:shadow-xl text-left flex flex-col justify-between h-36 transition-all duration-300 hover:-translate-y-0.5 active:scale-95 group"
                  >
                    <div>
                      <span className="text-[10px] font-bold text-[#E6AF2E] tracking-widest uppercase bg-[#E6AF2E]/5 px-2 py-0.5 rounded-full">{product.group}</span>
                      <h3 className="text-sm font-bold text-[#1D1D1F] line-clamp-2 mt-2 group-hover:text-[#0D2B45] transition-colors">{product.name}</h3>
                    </div>
                    <span className="text-base font-bold text-[#0D2B45] mt-4">
                      {product.basePrice.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                    </span>
                  </button>
                ))}
            </div>
          )}
        </main>

        {/* Warenkorb */}
        <aside className="col-span-4 bg-white border border-gray-200/50 rounded-3xl p-6 flex flex-col justify-between shadow-xl backdrop-blur-lg">
          <div>
            <h2 className="text-lg font-bold border-b pb-4 mb-4 text-[#0D2B45] tracking-tight">Einkaufszettel</h2>
            <div className="flex flex-col gap-4 overflow-y-auto max-h-[380px] pr-2">
              {cart.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-50">
                  <div>
                    <p className="text-sm font-bold text-gray-800">{item.name}</p>
                    <p className="text-xs text-gray-400 font-medium">
                      {item.quantity} x {item.priceAtSale.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                    </p>
                  </div>
                  <span className="font-bold text-sm text-[#0D2B45]">
                    {(item.priceAtSale * item.quantity).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                  </span>
                </div>
              ))}
              {cart.length === 0 && (
                <div className="text-center py-16 text-gray-300 flex flex-col items-center">
                  <span className="text-4xl mb-2">🛒</span>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Der Warenkorb ist leer</p>
                </div>
              )}
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-between text-lg font-bold mb-6">
              <span className="text-gray-500 font-medium">Summe</span>
              <span className="text-2xl font-bold text-[#0D2B45]">{totalCartPrice.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
            </div>
            
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleCheckout}
                disabled={cart.length === 0}
                className="w-full py-4 bg-[#0D2B45] hover:bg-[#1a4163] disabled:bg-gray-100 disabled:text-gray-300 text-white font-bold rounded-2xl transition-all duration-300 shadow-md active:scale-95"
              >
                Kauf abschließen
              </button>
              {lastSaleId && (
                <button 
                  onClick={handleStorno}
                  className="w-full py-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl transition-all duration-300 text-xs tracking-wider uppercase"
                >
                  Letzten Verkauf stornieren
                </button>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Untere Aktionsleiste (Pausenbeendigung) */}
      <footer className="bg-white border-t border-gray-200 px-8 py-4 flex justify-between items-center gap-4">
        <span className="text-xs text-gray-400 font-medium">Sitzung verwalten</span>
        <div className="flex gap-4">
          <button 
            onClick={() => handlePhaseChange('pause1')} 
            className="px-4 py-2 bg-gray-100 hover:bg-[#0071E3]/10 hover:text-[#0071E3] text-gray-600 font-bold rounded-xl text-xs uppercase tracking-wider transition-all"
          >
            Ende 1. Pause
          </button>
          <button 
            onClick={() => handlePhaseChange('pause2')} 
            className="px-4 py-2 bg-gray-100 hover:bg-purple-100 hover:text-purple-600 text-gray-600 font-bold rounded-xl text-xs uppercase tracking-wider transition-all"
          >
            Ende 2. Pause
          </button>
          <button 
            onClick={() => handlePhaseChange('closed')} 
            className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl text-xs uppercase tracking-wider transition-all"
          >
            Kassenschluss (Rot)
          </button>
        </div>
      </footer>
    </div>
  );
}