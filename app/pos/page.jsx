// app/pos/page.jsx
'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function PosInterface() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [lastSaleId, setLastSaleId] = useState(null);
  const [liveTime, setLiveTime] = useState('');
  const [liveDate, setLiveDate] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Toast State
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // System-Konfigurationen
  const [config, setConfig] = useState({ bannerActive: false, bannerMessage: '', maintenanceActive: false });

  // Berichts-States
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportTitle, setReportTitle] = useState('');
  const [pendingPhase, setPendingPhase] = useState('');
  const [reportData, setReportData] = useState({ brutto: 0, netto: 0, vat7: 0, vat19: 0, pfand: 0, count: 0 });

  // Tutorial States
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(1);

  // Dark-Mode Initialisierung & Live-Uhrzeit
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }

    const updateClock = () => {
      const now = new Date();
      setLiveTime(now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setLiveDate(now.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleTheme = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDarkMode(true);
    }
  };

  const triggerToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  const loadData = () => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => { if (data.products) setProducts(data.products); })
      .catch(err => console.error(err));

    fetch('/api/settings')
      .then(res => res.json())
      .then(data => { if (data.success && data.settings) setConfig(data.settings); })
      .catch(err => console.error(err));
  };

  useEffect(() => {
    loadData();
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
        triggerToast("Einkauf erfolgreich gebucht!", "success");
      } else {
        triggerToast("Datenbankfehler beim Speichern: " + (data.error || "Unbekannt"), "error");
      }
    } catch (err) {
      console.error(err);
      triggerToast("Verbindungsfehler zur Datenbank.", "error");
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
      triggerToast("Letzter Verkauf storniert!", "success");
      setLastSaleId(null);
    }
  };

  const prepareReport = async (phase) => {
    const titles = { 'pause1': 'Abschlussbericht: 1. Große Pause', 'pause2': 'Abschlussbericht: 2. Große Pause', 'closed': 'Tagesabschluss (Z-Bon): Kassenschluss' };
    setPendingPhase(phase);
    setReportTitle(titles[phase]);

    const localDateString = new Date().toLocaleDateString('sv-SE');

    try {
      const res = await fetch(`/api/admin/stats?date=${localDateString}`);
      const data = await res.json();
      if (data.success && data.summary) {
        setReportData({
          brutto: data.summary.totalRevenue || 0,
          netto: data.summary.totalNetto || 0,
          vat7: data.summary.totalVat * 0.35 || 0,
          vat19: data.summary.totalVat * 0.65 || 0,
          pfand: 0,
          count: data.summary.salesCount || 0
        });
        setShowReportModal(true);
      } else {
        setReportData({ brutto: 0, netto: 0, vat7: 0, vat19: 0, pfand: 0, count: 0 });
        setShowReportModal(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const confirmReport = async () => {
    const localDateString = new Date().toLocaleDateString('sv-SE');
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'UPDATE_STATUS', 
          statusType: pendingPhase,
          localDate: localDateString
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowReportModal(false);
        triggerToast(`${reportTitle} archiviert!`, "success");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const totalCartPrice = cart.reduce((acc, item) => acc + (item.priceAtSale * item.quantity), 0);

  if (config.maintenanceActive) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#09090B] flex flex-col items-center justify-center font-sans antialiased text-[#1D1D1F] dark:text-[#F5F5F7] p-6 transition-colors duration-500 relative overflow-hidden">
        <div className="max-w-md w-full text-center bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl border border-white/20 dark:border-zinc-800/50 p-10 rounded-3xl shadow-xl flex flex-col items-center z-10">
          <div className="h-16 w-16 rounded-2xl bg-[#D31329]/10 flex items-center justify-center mb-6 animate-pulse">
            <span className="text-3xl text-[#D31329]">🛠️</span>
          </div>
          <h2 className="text-2xl font-extrabold text-[#D31329] tracking-tight">Systemaktualisierung</h2>
          <p className="text-sm text-gray-500 dark:text-zinc-400 font-medium mt-4 leading-relaxed">
            Der Weltladen St. Ursula führt gerade ein System-Update oder eine Registerbereinigung durch. Wir sind in wenigen Minuten wieder einsatzbereit.
          </p>
          <div className="h-px w-full bg-gray-200/50 dark:bg-zinc-800/50 my-6" />
          <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-wider">St. Ursula Schulen Villingen • Schülerfirma</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#09090B] text-[#1D1D1F] dark:text-[#F5F5F7] font-sans antialiased flex flex-col selection:bg-[#D31329] selection:text-white transition-colors duration-500">
      
      {/* Marquee Keyframes */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee-continuous {
          display: inline-flex;
          white-space: nowrap;
          animation: marquee 25s linear infinite;
        }
      `}</style>

      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/75 dark:bg-[#09090B]/75 border-b border-gray-200/50 dark:border-zinc-800/50 px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link 
            href="/" 
            className="h-8 w-8 rounded-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-800 flex items-center justify-center text-sm font-bold text-gray-600 dark:text-zinc-300 transition-all active:scale-90"
            title="Zurück zur Auswahl"
          >
            ←
          </Link>
          <div className="flex items-center gap-3">
            <img 
              src="/logo.png" 
              alt="St. Ursula Villingen" 
              className="h-10 w-auto object-contain rounded dark:brightness-110"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[#D31329]">Weltladen St. Ursula</h1>
              <p className="text-xs text-gray-400 dark:text-zinc-500 font-bold tracking-wide">FAIRTRADE SCHÜLERFIRMA • VILLINGEN</p>
            </div>
          </div>
          <div className="h-6 w-px bg-gray-200 dark:bg-zinc-800" />
          <div className="text-sm font-semibold text-[#D31329] bg-[#D31329]/10 px-3 py-1 rounded-full flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#D31329] animate-pulse" />
            Live-Kasse
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <span className="text-sm font-bold text-gray-800 dark:text-zinc-100 font-mono tracking-widest">{liveTime || '00:00:00'}</span>
            <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-wider">{liveDate || 'Lade Datum...'}</p>
          </div>
          <div className="h-6 w-px bg-gray-200 dark:bg-zinc-800" />
          <button 
            onClick={toggleTheme}
            className="h-8 w-8 rounded-full border border-gray-300 dark:border-zinc-800 flex items-center justify-center text-sm shadow-sm"
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
          <button 
            onClick={() => { setTutorialStep(1); setShowTutorial(true); }}
            className="h-8 w-8 rounded-full border border-gray-300 dark:border-zinc-800 flex items-center justify-center text-sm font-bold text-gray-500 dark:text-zinc-400 hover:bg-[#D31329]/10 hover:text-[#D31329] transition-all cursor-pointer"
          >
            ?
          </button>
        </div>
      </header>

      {config.bannerActive && (
        <div className="bg-[#D31329]/10 dark:bg-[#D31329]/5 border-b border-[#D31329]/20 dark:border-[#D31329]/10 text-[#D31329] py-3 text-sm font-bold tracking-wide select-none">
          <div className="animate-marquee-continuous flex gap-16 pr-16">
            <span>📢 {config.bannerMessage}</span>
            <span>📢 {config.bannerMessage}</span>
            <span>📢 {config.bannerMessage}</span>
            <span>📢 {config.bannerMessage}</span>
          </div>
          <div className="animate-marquee-continuous flex gap-16 pr-16" aria-hidden="true">
            <span>📢 {config.bannerMessage}</span>
            <span>📢 {config.bannerMessage}</span>
            <span>📢 {config.bannerMessage}</span>
            <span>📢 {config.bannerMessage}</span>
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="flex-1 grid grid-cols-12 gap-6 p-8">
        <main className="col-span-8 flex flex-col gap-6">
          <div className="relative shadow-sm rounded-2xl">
            <input 
              type="text" 
              placeholder="Artikel suchen..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-6 py-4 rounded-2xl border border-gray-200/50 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-4 focus:ring-[#D31329]/10 dark:focus:ring-[#D31329]/5 focus:border-[#D31329] transition-all duration-300 shadow-sm font-medium text-gray-800 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500"
            />
          </div>

          {products.length === 0 ? (
            <div className="flex-1 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl p-12 flex flex-col items-center justify-center text-center shadow-sm">
              <h3 className="text-lg font-bold text-[#D31329]">Lade Produkte...</h3>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto grid grid-cols-3 gap-4 pr-2 max-h-[calc(100vh-280px)]">
              {products
                .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
                .map(product => (
                  <button
                    key={product._id}
                    onClick={() => addToCart(product)}
                    className="p-5 bg-white dark:bg-zinc-900 border border-gray-100/80 dark:border-zinc-800 hover:border-[#D31329] dark:hover:border-[#D31329] rounded-3xl shadow-sm hover:shadow-xl text-left flex flex-col justify-between h-36 transition-all duration-300 hover:-translate-y-0.5 active:scale-95 group"
                  >
                    <div>
                      <span className="text-[10px] font-bold text-[#D31329] tracking-widest uppercase bg-[#D31329]/10 px-2 py-0.5 rounded-full">{product.group}</span>
                      <h3 className="text-sm font-bold text-gray-800 dark:text-zinc-200 line-clamp-2 mt-2 group-hover:text-[#D31329] transition-colors">{product.name}</h3>
                    </div>
                    <span className="text-base font-bold text-[#D31329] mt-4">
                      {product.basePrice.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                    </span>
                  </button>
                ))}
            </div>
          )}
        </main>

        <aside className="col-span-4 bg-white/70 dark:bg-zinc-900/70 border border-gray-200/50 dark:border-zinc-800/50 rounded-3xl p-6 flex flex-col justify-between shadow-xl backdrop-blur-xl">
          <div>
            <h2 className="text-lg font-bold border-b pb-4 mb-4 text-[#D31329] tracking-tight">Einkaufszettel</h2>
            <div className="flex flex-col gap-4 overflow-y-auto max-h-[380px] pr-2">
              {cart.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-50 dark:border-zinc-800/50">
                  <div>
                    <p className="text-sm font-bold text-gray-800 dark:text-zinc-200">{item.name}</p>
                    <p className="text-xs text-gray-400 dark:text-zinc-500 font-medium">{item.quantity} x {item.priceAtSale.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</p>
                  </div>
                  <span className="font-bold text-sm text-[#D31329]">
                    {(item.priceAtSale * item.quantity).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t dark:border-zinc-800 pt-4">
            <div className="flex justify-between text-lg font-bold mb-6">
              <span className="text-gray-500 dark:text-zinc-400 font-medium">Summe</span>
              <span className="text-2xl font-bold text-[#D31329]">{totalCartPrice.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
            </div>
            <button 
              onClick={handleCheckout} 
              disabled={cart.length === 0} 
              className="w-full py-4 bg-[#D31329] hover:bg-[#b01020] disabled:bg-gray-100 dark:disabled:bg-zinc-800 disabled:text-gray-300 dark:disabled:text-zinc-600 text-white font-bold rounded-2xl transition-all duration-300 shadow-md active:scale-95"
            >
              Kauf abschließen
            </button>
            {lastSaleId && (
              <button onClick={handleStorno} className="w-full mt-2 py-2 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 text-[#D31329] font-bold rounded-xl text-xs uppercase tracking-wider">Stornieren</button>
            )}
          </div>
        </aside>
      </div>

      {/* Footer */}
      <footer className="bg-white dark:bg-[#09090B] border-t border-gray-200 dark:border-zinc-800 px-8 py-5 flex justify-between items-center gap-4">
        <div className="text-xs text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-wider">Schaltung verwalten</div>
        <div className="flex gap-4">
          <button onClick={() => prepareReport('pause1')} className="px-6 py-3 bg-blue-500/10 text-blue-600 hover:bg-blue-500 hover:text-white font-bold rounded-2xl text-xs uppercase tracking-wider transition-all duration-300 shadow-sm active:scale-95">Ende 1. Pause</button>
          <button onClick={() => prepareReport('pause2')} className="px-6 py-3 bg-purple-500/10 text-purple-600 hover:bg-purple-500 hover:text-white font-bold rounded-2xl text-xs uppercase tracking-wider transition-all duration-300 shadow-sm active:scale-95">Ende 2. Pause</button>
          <button onClick={() => prepareReport('closed')} className="px-6 py-3 bg-red-500/10 text-[#D31329] hover:bg-[#D31329] hover:text-white font-bold rounded-2xl text-xs uppercase tracking-wider transition-all duration-300 shadow-sm active:scale-95">Kassenschluss (Rot)</button>
        </div>
      </footer>

      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
          <div className="bg-white/95 dark:bg-zinc-950/95 max-w-md w-full rounded-3xl p-8 shadow-2xl border border-white/20 dark:border-zinc-800/50 relative">
            <button onClick={() => setShowReportModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-lg font-bold">✕</button>
            <div className="text-center border-b border-dashed border-gray-300 dark:border-zinc-800 pb-4 mb-6">
              <span className="text-xs font-bold text-[#D31329] tracking-widest uppercase bg-[#D31329]/10 px-3 py-1 rounded-full">Kassenbericht</span>
              <h2 className="text-xl font-extrabold text-[#D31329] mt-3">{reportTitle}</h2>
              <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-bold uppercase mt-1">St. Ursula Villingen</p>
            </div>
            <div className="flex flex-col gap-4 font-mono text-sm text-gray-700 dark:text-zinc-300">
              <div className="flex justify-between border-b dark:border-zinc-800 pb-2 text-xs text-gray-400 dark:text-zinc-500 font-sans font-bold uppercase"><span>Posten</span><span>Summe</span></div>
              <div className="flex justify-between"><span>Bediente Belege:</span><span className="font-bold font-sans">{reportData.count} Bons</span></div>
              <div className="flex justify-between"><span>Umsatz (Brutto):</span><span className="font-bold">{reportData.brutto.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span></div>
              <div className="flex justify-between text-xs text-gray-400 dark:text-zinc-500 pl-4"><span>dav. MwSt 7%:</span><span>{reportData.vat7.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span></div>
              <div className="flex justify-between text-xs text-gray-400 dark:text-zinc-500 pl-4"><span>dav. MwSt 19%:</span><span>{reportData.vat19.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span></div>
              <div className="flex justify-between border-t dark:border-zinc-800 pt-2"><span>Umsatz (Netto):</span><span className="font-bold">{reportData.netto.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span></div>
              <div className="flex justify-between border-t-2 border-dashed border-gray-300 dark:border-zinc-800 pt-4 text-base font-bold text-[#D31329] font-sans"><span>Soll-Bargeld:</span><span>{reportData.brutto.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span></div>
            </div>
            <div className="mt-8 border-t dark:border-zinc-800 pt-6 flex flex-col gap-3 font-sans">
              <p className="text-[10px] text-gray-400 text-center font-bold uppercase tracking-wider mb-2">Generiert am {new Date().toLocaleDateString('de-DE')} • {new Date().toLocaleTimeString('de-DE')}</p>
              <button onClick={confirmReport} className="w-full py-4 bg-[#D31329] hover:bg-[#163f61] text-white font-bold rounded-2xl shadow-md">Bericht archivieren</button>
              <button onClick={() => window.print()} className="w-full py-2 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-600 dark:text-zinc-300 font-bold rounded-xl text-xs uppercase tracking-wider">Bericht drucken</button>
            </div>
          </div>
        </div>
      )}

      {toast.show && (
        <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-md border ${
          toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800' : 'bg-red-500/10 border-red-500/20 text-[#D31329]'
        }`}>
          <span className="text-lg">{toast.type === 'success' ? '✅' : '❌'}</span>
          <span className="text-sm font-bold tracking-wide">{toast.message}</span>
        </div>
      )}

      {/* TUTORIAL MODAL */}
      {showTutorial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-md p-4">
          <div className="bg-white/95 dark:bg-zinc-950/95 max-w-lg w-full rounded-3xl p-8 shadow-2xl border border-white/20 flex flex-col justify-between relative">
            <button onClick={() => setShowTutorial(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-lg font-bold">✕</button>
            
            <div className="text-center border-b border-gray-100 dark:border-zinc-800 pb-4 mb-6">
              <span className="text-[10px] font-bold text-[#D31329] tracking-widest uppercase bg-[#D31329]/10 px-3 py-1 rounded-full">Benutzerhandbuch</span>
              <h2 className="text-xl font-extrabold text-[#0B2F5C] mt-3">Kassen-Tutorial • Schritt {tutorialStep} von 4</h2>
            </div>

            <div className="py-4 text-[#1D1D1F] dark:text-zinc-200 leading-relaxed">
              {tutorialStep === 1 && (
                <div className="flex flex-col items-center text-center">
                  <span className="text-4xl mb-4">🛒</span>
                  <h3 className="font-extrabold text-base text-[#D31329]">Produkte erfassen</h3>
                  <p className="text-sm text-gray-500 dark:text-zinc-400 mt-2 font-medium">Tippe einfach auf die runden Produktkarten im linken Katalog, um Artikel in deinen Einkaufszettel (Warenkorb) zu legen. Nutze das Suchfeld ganz oben, um Produkte blitzschnell nach Namen zu filtern.</p>
                </div>
              )}
              {tutorialStep === 2 && (
                <div className="flex flex-col items-center text-center">
                  <span className="text-4xl mb-4">💳</span>
                  <h3 className="font-extrabold text-base text-[#D31329]">Kauf abschließen</h3>
                  <p className="text-sm text-gray-500 dark:text-zinc-400 mt-2 font-medium">Überprüfe die Summe im Einkaufszettel rechts und klicke auf <span className="font-bold text-[#D31329]">„Kauf abschließen“</span>. Der Umsatz wird sofort in der MongoDB-Cloud gespeichert. Falls du dich vertippt hast, klicke sofort auf <span className="font-bold text-red-500">„Stornieren“</span>.</p>
                </div>
              )}
              {tutorialStep === 3 && (
                <div className="flex flex-col items-center text-center">
                  <span className="text-4xl mb-4">📊</span>
                  <h3 className="font-extrabold text-base text-[#D31329]">Pausenschnitt (Cut) machen</h3>
                  <p className="text-sm text-gray-500 dark:text-zinc-400 mt-2 font-medium">Nach der 1. und 2. Pause klickt das Team unten auf den jeweiligen Pausen-Button. Ein Z-Bon öffnet sich und berechnet die Summen. Klicke dort auf <span className="font-bold text-[#D31329]">„Bericht archivieren“</span>. Danach startet die Kasse wieder sauber bei <span className="font-bold text-[#D31329]">0,00 €</span>.</p>
                </div>
              )}
              {tutorialStep === 4 && (
                <div className="flex flex-col items-center text-center">
                  <span className="text-4xl mb-4">🔒</span>
                  <h3 className="font-extrabold text-base text-[#D31329]">Schichtwechsel & Schutz</h3>
                  <p className="text-sm text-gray-500 dark:text-zinc-400 mt-2 font-medium">Über den Pfeil-Button <span className="font-bold">「←」</span> oben links gelangst du jederzeit zurück zum Startmenü. Der Admin-Bereich ist durch das Kennwort geschützt, damit Schüler keine unbefugten Preisänderungen vornehmen können.</p>
                </div>
              )}
            </div>

            <div className="mt-8 border-t dark:border-zinc-800 pt-6 flex justify-between items-center">
              <button disabled={tutorialStep === 1} onClick={() => setTutorialStep(prev => prev - 1)} className="px-4 py-2 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 font-bold rounded-xl text-xs uppercase tracking-wider transition-all">Zurück</button>
              <div className="flex gap-2">
                {[1, 2, 3, 4].map(idx => (
                  <span key={idx} className={`h-2 w-2 rounded-full transition-all duration-300 ${tutorialStep === idx ? 'bg-[#D31329] w-4' : 'bg-gray-300'}`} />
                ))}
              </div>
              {tutorialStep < 4 ? (
                <button onClick={() => setTutorialStep(prev => prev + 1)} className="px-4 py-2 bg-[#D31329] hover:bg-[#b01020] text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all">Weiter</button>
              ) : (
                <button onClick={() => setShowTutorial(false)} className="px-4 py-2 bg-[#D31329] hover:bg-[#b01020] text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all">Fertig</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Copyright Footer */}
      <footer className="mt-auto py-5 text-center text-[10px] text-gray-400 dark:text-zinc-600 font-bold uppercase tracking-wider bg-white dark:bg-zinc-950 border-t border-gray-150 dark:border-zinc-800">
        © 2026 Schülerfirma Weltladen St. Ursula Villingen. Alle Rechte vorbehalten für Jill Manuel Hils.
      </footer>
    </div>
  );
}