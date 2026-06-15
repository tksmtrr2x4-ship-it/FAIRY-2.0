// app/pos/page.jsx
'use client';
import React, { useState, useEffect } from 'react';

export default function PosInterface() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [lastSaleId, setLastSaleId] = useState(null);

  // Produkte aus der API laden
  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        if (data.products) setProducts(data.products);
      })
      .catch(err => console.error("Fehler beim Laden der Produkte:", err));
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
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CHECKOUT', items: cart })
      });
      const data = await res.json();
      if (data.success) {
        setLastSaleId(data.sale._id);
        setCart([]);
        alert("Verkauf erfolgreich gebucht!");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStorno = async () => {
    if (!lastSaleId) return;
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'STORNO', saleId: lastSaleId })
      });
      const data = await res.json();
      if (data.success) {
        alert("Letzter Verkauf wurde erfolgreich storniert!");
        setLastSaleId(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePhaseChange = async (phase) => {
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'UPDATE_STATUS', statusType: phase })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Phase '${phase}' erfolgreich abgeschlossen und gespeichert.`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const totalCartPrice = cart.reduce((acc, item) => acc + (item.priceAtSale * item.quantity), 0);

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] font-sans flex flex-col">
      {/* Header */}
      <header className="bg-ursulaNavy text-white px-8 py-4 flex justify-between items-center shadow-sm">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Weltladen St. Ursula</h1>
          <p className="text-xs text-slate-300">Kassensystem • {new Date().toLocaleDateString('de-DE')}</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => handlePhaseChange('pause1')} 
            className="px-4 py-2 bg-[#0071E3] hover:bg-[#0077ED] text-white font-medium rounded-full text-sm transition-all shadow-sm active:scale-95"
          >
            Ende 1. Pause
          </button>
          <button 
            onClick={() => handlePhaseChange('pause2')} 
            className="px-4 py-2 bg-[#862D86] hover:bg-[#993399] text-white font-medium rounded-full text-sm transition-all shadow-sm active:scale-95"
          >
            Ende 2. Pause
          </button>
          <button 
            onClick={() => handlePhaseChange('closed')} 
            className="px-4 py-2 bg-[#E30000] hover:bg-[#FF0000] text-white font-medium rounded-full text-sm transition-all shadow-sm active:scale-95"
          >
            Kassenschluss (Rot)
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-12 gap-6 p-6">
        {/* Produkt-Katalog */}
        <main className="col-span-8 flex flex-col gap-4">
          <input 
            type="text" 
            placeholder="Artikel suchen..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-5 py-3 rounded-2xl border border-gray-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-ursulaNavy transition-all"
          />

          <div className="flex-1 overflow-y-auto grid grid-cols-3 gap-4 pr-2 max-h-[calc(100vh-230px)]">
            {products
              .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
              .map(product => (
                <button
                  key={product._id}
                  onClick={() => addToCart(product)}
                  className="p-5 bg-white border border-gray-100 hover:border-ursulaNavy rounded-2xl shadow-sm hover:shadow-md text-left flex flex-col justify-between h-32 transition-all active:scale-95"
                >
                  <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">{product.group}</span>
                  <span className="text-sm font-medium text-[#1D1D1F] line-clamp-2 mt-1">{product.name}</span>
                  <span className="text-base font-semibold text-ursulaNavy mt-2">
                    {product.basePrice.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                  </span>
                </button>
              ))}
          </div>
        </main>

        {/* Warenkorb */}
        <aside className="col-span-4 bg-white border border-gray-200 rounded-3xl p-6 flex flex-col justify-between shadow-lg">
          <div>
            <h2 className="text-lg font-semibold border-b pb-4 mb-4">Aktueller Warenkorb</h2>
            <div className="flex flex-col gap-4 overflow-y-auto max-h-[350px] pr-2">
              {cart.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-gray-400">
                      {item.quantity} x {item.priceAtSale.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                    </p>
                  </div>
                  <span className="font-semibold text-sm">
                    {(item.priceAtSale * item.quantity).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                  </span>
                </div>
              ))}
              {cart.length === 0 && (
                <p className="text-center text-sm text-gray-400 py-10">Keine Artikel im Korb</p>
              )}
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-between text-lg font-bold mb-6">
              <span>Gesamtsumme:</span>
              <span className="text-ursulaNavy">{totalCartPrice.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
            </div>
            
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleCheckout}
                disabled={cart.length === 0}
                className="w-full py-4 bg-fairtradeAmber hover:bg-[#d49e1e] disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold rounded-2xl transition-all shadow-md active:scale-95"
              >
                Bezahlen & Buchen
              </button>
              {lastSaleId && (
                <button 
                  onClick={handleStorno}
                  className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-red-600 font-medium rounded-xl transition-all text-sm"
                >
                  Letzten Bon stornieren (Storno)
                </button>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}