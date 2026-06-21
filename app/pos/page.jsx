'use client';
import React, { useState, useEffect } from 'react';

export default function PosInterface() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [lastSaleId, setLastSaleId] = useState(null);
  const [liveTime, setLiveTime] = useState('');

  // Live-Uhrzeit
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
    
    const localDateString = new Date().toLocaleDateString('sv-SE'); 

    const formattedItems = cart.map(item => ({
      productId: item.id,
      name: item.name,
      quantity: item.quantity,
      priceAtSale: item.priceAtSale,
      vatRateAtSale: item.vatRateAtSale
    }));

    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'CHECKOUT', 
          items: formattedItems,
          localDate: localDateString
        })
      });
      const data = await res.json();
      if (data.success) {
        setLastSaleId(data.sale._id);
        setCart([]);
        alert("Einkauf erfolgreich gebucht!");
      } else {
        alert("Fehler beim Buchen: " + (data.error || "Unbekannter Fehler"));
      }
    } catch (err) {
      console.error(err);
      alert("Netzwerkfehler beim Buchen.");
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
      alert("Letzter Verkauf storniert!");
      setLastSaleId(null);
    }
  };

  const handlePhaseChange = async (phase) => {
    const localDateString = new Date().toLocaleDateString('sv-SE');
    const res = await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'UPDATE_STATUS', statusType: phase, localDate: localDateString })
    });
    const data = await res.json();
    if (data.success) {
      alert(`Phase '${phase}' wurde erfolgreich archiviert.`);
    }
  };

  const totalCartPrice = cart.reduce((acc, item) => acc + (item.priceAtSale * item.quantity), 0);

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] font-sans flex flex-col">
      <header className="bg-[#0D2B45] text-white px-8 py-4 flex justify-between items-center shadow-sm">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Weltladen St. Ursula</h1>
          <p className="text-xs text-slate-300">Kassensystem • {new Date().toLocaleDateString('de-DE')}</p>
        </div>
        <div className="flex gap-4">
          <button onClick={() => handlePhaseChange('pause1')} className="px-4 py-2 bg-[#0071E3] hover:bg-[#0077ED] text-white font-medium rounded-full text-sm">Ende 1. Pause</button>
          <button onClick={() => handlePhaseChange('pause2')} className="px-4 py-2 bg-[#862D86] hover:bg-[#993399] text-white font-medium rounded-full text-sm">Ende 2. Pause</button>
          <button onClick={() => handlePhaseChange('closed')} className="px-4 py-2 bg-[#E30000] hover:bg-[#FF0000] text-white font-medium rounded-full text-sm">Kassenschluss (Rot)</button>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-12 gap-6 p-6">
        <main className="col-span-8 flex flex-col gap-4">
          <input type="text" placeholder="Artikel suchen..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full px-5 py-3 rounded-2xl border bg-white focus:outline-none focus:ring-2 focus:ring-[#0D2B45]" />
          <div className="flex-1 overflow-y-auto grid grid-cols-3 gap-4 pr-2 max-h-[calc(100vh-230px)]">
            {products.filter(p => p.name.toLowerCase().includes(search.toLowerCase())).map(product => (
              <button key={product._id} onClick={() => addToCart(product)} className="p-5 bg-white border rounded-2xl text-left flex flex-col justify-between h-32 hover:border-[#0D2B45]">
                <span className="text-xs text-slate-400">{product.group}</span>
                <span className="text-sm font-medium mt-1">{product.name}</span>
                <span className="text-base font-semibold mt-2">{product.basePrice.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
              </button>
            ))}
          </div>
        </main>

        <aside className="col-span-4 bg-white border rounded-3xl p-6 flex flex-col justify-between shadow-lg">
          <div>
            <h2 className="text-lg font-semibold border-b pb-4 mb-4">Aktueller Einkaufszettel</h2>
            <div className="flex flex-col gap-4 overflow-y-auto max-h-[350px]">
              {cart.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-gray-400">{item.quantity} x {item.priceAtSale.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</p>
                  </div>
                  <span className="font-semibold text-sm">{(item.priceAtSale * item.quantity).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="border-t pt-4">
            <div className="flex justify-between text-lg font-bold mb-6">
              <span>Summe:</span>
              <span>{totalCartPrice.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
            </div>
            <button onClick={handleCheckout} disabled={cart.length === 0} className="w-full py-4 bg-[#E6AF2E] text-white font-semibold rounded-2xl">Kauf abschließen</button>
          </div>
        </aside>
      </div>
    </div>
  );
}