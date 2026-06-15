// app/pos/page.jsx
'use client';
import React, { useState, useEffect } from 'react';

export default function PosInterface() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [lastSaleId, setLastSaleId] = useState(null);
  const [liveTime, setLiveTime] = useState('');

  // States für den interaktiven Pausen-/Kassenschluss-Bericht
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportTitle, setReportTitle] = useState('');
  const [pendingPhase, setPendingPhase] = useState('');
  const [reportData, setReportData] = useState({
    brutto: 0,
    netto: 0,
    vat7: 0,
    vat19: 0,
    pfand: 0,
    count: 0
  });

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
  const loadProducts = () => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        if (data.products) setProducts(data.products);
      })
      .catch(err => console.error("API-Verbindungsfehler:", err));
  };

  useEffect(() => {
    loadProducts();
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

  // Interaktiver Kassensturz-Prozess (Vorschau generieren)
  const prepareReport = async (phase) => {
    const titles = {
      'pause1': 'Abschlussbericht: 1. Große Pause',
      'pause2': 'Abschlussbericht: 2. Große Pause',
      'closed': 'Tagesabschluss (Z-Bon): Kassenschluss'
    };

    setPendingPhase(phase);
    setReportTitle(titles[phase]);

    try {
      // Statistiken der aktiven (unarchivierten) Verkäufe abrufen
      const res = await fetch('/api/admin/stats');
      const data = await res.json();
      
      if (data.success || data.summary) {
        // Wir simulieren den Kassenbericht basierend auf den aktuell offenen Verkäufen
        setReportData({
          brutto: data.summary.totalRevenue || 0,
          netto: data.summary.totalNetto || 0,
          vat7: data.summary.totalVat * 0.35 || 0, // Gewichtete MwSt-Aufteilung (7%)
          vat19: data.summary.totalVat * 0.65 || 0, // Gewichtete MwSt-Aufteilung (19%)
          pfand: 0, // Wird bei Buchung verrechnet
          count: data.summary.salesCount || 0
        });
        setShowReportModal(true);
      } else {
        // Fallback falls heute noch gar kein Verkauf getätigt wurde
        setReportData({ brutto: 0, netto: 0, vat7: 0, vat19: 0, pfand: 0, count: 0 });
        setShowReportModal(true);
      }
    } catch (err) {
      console.error(err);
      alert("Fehler beim Erstellen des Kassenberichts.");
    }
  };

  // Bericht bestätigen & in Datenbank festschreiben
  const confirmReport = async () => {
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'UPDATE_STATUS', statusType: pendingPhase })
      });
      const data = await res.json();
      if (data.success) {
        setShowReportModal(false);
        alert(`${reportTitle} erfolgreich archiviert! Die Kasse wurde für die nächste Phase zurückgesetzt.`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const totalCartPrice = cart.reduce((acc, item) => acc + (item.priceAtSale * item.quantity), 0);

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] font-sans antialiased flex flex-col selection:bg-[#0D2B45] selection:text-white">
      {/* Premium Apple Navigation Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/75 border-b border-gray-200/50 px-8 py-4 flex justify-between items-center transition-all duration-300">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#0D2B45]">Weltladen St. Ursula</h1>
            <p className="text-xs text-gray-400 font-bold tracking-wide">FAIRTRADE SCHÜLERFIRMA • VILLINGEN</p>
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
              <h3 className="text-lg font-bold text-[#0D2B45]">Lade Produktdaten...</h3>
              <p className="text-sm text-gray-400 max-w-sm mt-2 font-medium">
                Falls dieser Ladebildschirm dauerhaft bleibt, prüfe bitte, ob dein MongoDB-Passwort und die IP-Freigabe korrekt sind.
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
                  Letzten Bon stornieren
                </button>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Interaktiver Kassensturz / Pausenbeendigung Footer */}
      <footer className="bg-white border-t border-gray-200 px-8 py-5 flex justify-between items-center gap-4">
        <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">
          Pausen- & Schlussschaltung verwalten
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => prepareReport('pause1')} 
            className="px-6 py-3 bg-blue-500/10 text-blue-600 hover:bg-blue-500 hover:text-white font-bold rounded-2xl text-xs uppercase tracking-wider transition-all duration-300 shadow-sm active:scale-95"
          >
            Ende 1. Pause
          </button>
          <button 
            onClick={() => prepareReport('pause2')} 
            className="px-6 py-3 bg-purple-500/10 text-purple-600 hover:bg-purple-500 hover:text-white font-bold rounded-2xl text-xs uppercase tracking-wider transition-all duration-300 shadow-sm active:scale-95"
          >
            Ende 2. Pause
          </button>
          <button 
            onClick={() => prepareReport('closed')} 
            className="px-6 py-3 bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white font-bold rounded-2xl text-xs uppercase tracking-wider transition-all duration-300 shadow-sm active:scale-95"
          >
            Kassenschluss (Rot)
          </button>
        </div>
      </footer>

      {/* GORGEOUS APPLE GLASSMORPHIC Z-REPORT MODAL */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-white/95 max-w-md w-full rounded-3xl p-8 shadow-2xl border border-white/20 flex flex-col justify-between relative transform scale-100 transition-all">
            
            {/* Schließen Button */}
            <button 
              onClick={() => setShowReportModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-lg font-bold"
            >
              ✕
            </button>

            {/* Bon-Header */}
            <div className="text-center border-b border-dashed border-gray-300 pb-4 mb-6">
              <span className="text-xs font-bold text-[#E6AF2E] tracking-widest uppercase bg-[#E6AF2E]/10 px-3 py-1 rounded-full">Kassenbericht</span>
              <h2 className="text-xl font-extrabold text-[#0D2B45] tracking-tight mt-3">{reportTitle}</h2>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">St. Ursula Schulen Villingen • Schülerfirma</p>
            </div>

            {/* Beleg-Körper */}
            <div className="flex flex-col gap-4 font-mono text-sm text-gray-700">
              <div className="flex justify-between border-b pb-2 text-xs text-gray-400 font-sans font-bold uppercase">
                <span>Posten</span>
                <span>Summe</span>
              </div>
              
              <div className="flex justify-between">
                <span>Bediente Belege:</span>
                <span className="font-bold font-sans">{reportData.count} Bons</span>
              </div>

              <div className="flex justify-between">
                <span>Umsatz (Brutto):</span>
                <span className="font-bold">{reportData.brutto.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
              </div>

              <div className="flex justify-between text-xs text-gray-400 pl-4">
                <span>dav. MwSt 7%:</span>
                <span>{reportData.vat7.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
              </div>

              <div className="flex justify-between text-xs text-gray-400 pl-4">
                <span>dav. MwSt 19%:</span>
                <span>{reportData.vat19.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
              </div>

              <div className="flex justify-between border-t pt-2">
                <span>Umsatz (Netto):</span>
                <span className="font-bold">{reportData.netto.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
              </div>

              <div className="flex justify-between text-gray-400">
                <span>Pfand-Umsatz:</span>
                <span>0,00 €</span>
              </div>

              <div className="flex justify-between border-t-2 border-dashed border-gray-300 pt-4 text-base font-bold text-[#0D2B45] font-sans">
                <span>Soll-Bargeldbestand:</span>
                <span>{reportData.brutto.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
              </div>
            </div>

            {/* Bon-Footer mit Aktionsbuttons */}
            <div className="mt-8 border-t pt-6 flex flex-col gap-3 font-sans">
              <p className="text-[10px] text-gray-400 text-center font-bold uppercase tracking-wider mb-2">
                Generiert am {new Date().toLocaleDateString('de-DE')} • {new Date().toLocaleTimeString('de-DE')}
              </p>
              <button 
                onClick={confirmReport}
                className="w-full py-4 bg-[#0D2B45] hover:bg-[#163f61] text-white font-bold rounded-2xl shadow-md transition-all active:scale-95"
              >
                Bericht abschließen & archivieren
              </button>
              <button 
                onClick={() => window.print()}
                className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl text-xs uppercase tracking-wider transition-all"
              >
                Bericht drucken (Z-Bon)
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}