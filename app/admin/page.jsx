// app/admin/page.jsx - [Vollkommen abgesichert gegen Prerender-Fehler mit ssr: false]
'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// DYNAMISCHER IMPORT DER CHART-KOMPONENTEN
const ResponsiveContainer = dynamic(() => import('recharts').then((mod) => mod.ResponsiveContainer), { ssr: false });
const BarChart = dynamic(() => import('recharts').then((mod) => mod.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then((mod) => mod.Bar), { ssr: false });
const XAxis = dynamic(() => import('recharts').then((mod) => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then((mod) => mod.YAxis), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then((mod) => mod.Tooltip), { ssr: false });

// Haupt-Komponente als Container-Funktion definieren
const AdminDashboardComponent = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const [stats, setStats] = useState({ totalRevenue: 0, salesCount: 0, totalNetto: 0 });
  const [bestSellers, setBestSellers] = useState([]);
  const [products, setProducts] = useState([]);
  const [salesJournal, setSalesJournal] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [liveTime, setLiveTime] = useState('');
  const [liveDate, setLiveDate] = useState('');

  // Perioden Creator States
  const [newPeriodName, setNewPeriodName] = useState('');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');

  // System-Config States
  const [bannerActive, setBannerActive] = useState(false);
  const [bannerMessage, setBannerMessage] = useState('');
  const [maintenanceActive, setMaintenanceActive] = useState(false);

  // Cinematic Loading States
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [startSplitting, setStartSplitting] = useState(false);

  // Crash-sichere Uhrzeitformatierung
  const safeFormatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  };

  const safeFormatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('de-DE');
  };

  // Dark-Mode initialisieren
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }

    const auth = localStorage.getItem('admin_auth');
    if (auth === 'true') setIsAuthenticated(true);
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

  const handleLogin = (e) => {
    e.preventDefault();
    if (passcode === 'StUrsulaWeltladen2026') {
      localStorage.setItem('admin_auth', 'true');
      setIsAuthenticated(true);
    } else {
      alert("Falsches Admin-Kennwort!");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_auth');
    setIsAuthenticated(false);
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    const updateClock = () => {
      const now = new Date();
      setLiveTime(now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setLiveDate(now.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'short' }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // DYNAMISCHER TIMEOUT TRIGGER (Startet erst NACHDEM du eingeloggt bist!)
  useEffect(() => {
    if (isAuthenticated) {
      setIsTransitioning(true); // Blendet die Tore ein
      setStartSplitting(false); // Schließt sie zunächst

      const splitTimeout = setTimeout(() => {
        setStartSplitting(true); // Tore gleiten auseinander
      }, 4200);

      const endTimeout = setTimeout(() => {
        setIsTransitioning(false); // Tore werden komplett entfernt
      }, 5000);

      return () => {
        clearTimeout(splitTimeout);
        clearTimeout(endTimeout);
      };
    }
  }, [isAuthenticated]);

  const loadData = () => {
    fetch('/api/periods')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.periods) {
          setPeriods(data.periods);
          if (!selectedPeriodId && data.periods.length > 0) {
            const q2 = data.periods.find(p => p.name.includes("Q2"));
            setSelectedPeriodId(q2 ? q2._id : data.periods[0]._id);
          }
        }
      });

    fetch('/api/products')
      .then(res => res.json())
      .then(data => { if (data.products) setProducts(data.products); })
      .catch(err => console.error(err));

    fetch('/api/sales')
      .then(res => res.json())
      .then(data => { if (data.success && data.sales) setSalesJournal(data.sales); })
      .catch(err => console.error(err));

    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.settings) {
          setBannerActive(data.settings.bannerActive);
          setBannerMessage(data.settings.bannerMessage);
          setMaintenanceActive(data.settings.maintenanceActive);
        }
      })
      .catch(err => console.error(err));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (isAuthenticated) loadData();
  }, [isAuthenticated]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!selectedPeriodId || periods.length === 0) return;
    const activePeriod = periods.find(p => p._id === selectedPeriodId);
    if (!activePeriod) return;

    fetch(`/api/admin/stats?startDate=${activePeriod.startDate}&endDate=${activePeriod.endDate}`)
      .then(res => res.json())
      .then(data => {
        if (data.summary) setStats(data.summary);
        if (data.bestSellers) setBestSellers(data.bestSellers);
      });
  }, [selectedPeriodId, periods]);

  const handlePriceUpdate = async (id, newPrice) => {
    if (!newPrice || isNaN(newPrice)) return;
    const res = await fetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price: parseFloat(newPrice) })
    });
    if (res.ok) loadData();
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('pname');
    const group = formData.get('pgroup');
    const basePrice = formData.get('pprice');
    const vatRate = formData.get('pvat');

    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        name, 
        group, 
        basePrice: parseFloat(basePrice), 
        vatRate: parseInt(vatRate) 
      })
    });
    if (res.ok) { 
      e.currentTarget.reset(); 
      loadData(); 
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!confirm("Produkt löschen?")) return;
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
    if (res.ok) loadData();
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bannerActive, bannerMessage, maintenanceActive })
    });
    if (res.ok) alert("Systemkonfiguration erfolgreich aktualisiert!");
  };

  const handleJournalStorno = async (saleId) => {
    if (!confirm("Diesen Beleg wirklich stornieren?")) return;
    const res = await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'STORNO', saleId })
    });
    if (res.ok) loadData();
  };

  const handleCreatePeriod = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/periods', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newPeriodName, startDate: newStartDate, endDate: newEndDate })
    });
    if (res.ok) {
      setNewPeriodName('');
      setNewStartDate('');
      setNewEndDate('');
      loadData();
      alert("Abrechnungszeitraum erfolgreich angelegt!");
    }
  };

  const handleDeletePeriod = async (id) => {
    if (!confirm("Möchtest du diesen Abrechnungszeitraum wirklich löschen?")) return;
    const res = await fetch(`/api/periods/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setSelectedPeriodId('');
      loadData();
    }
  };

  const getFilteredSales = () => {
    const activePeriod = periods.find(p => p._id === selectedPeriodId);
    if (!activePeriod) return [];
    return (salesJournal || []).filter(sale => {
      const date = sale.saleDate;
      return date >= activePeriod.startDate && date <= activePeriod.endDate;
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center font-sans">
        <form onSubmit={handleLogin} className="bg-white/80 backdrop-blur-md p-10 rounded-3xl shadow-xl max-w-sm w-full border border-white/20 text-center animate-fade-in">
          <span className="text-4xl mb-4 block">🔒</span>
          <h2 className="text-xl font-bold text-[#D31329] mb-2 tracking-tight">Admin-Bereich geschützt</h2>
          <p className="text-xs text-gray-400 mb-6 font-semibold uppercase tracking-wider">St. Ursula Weltladen Villingen</p>
          <input 
            type="password" 
            placeholder="Kennwort eingeben..."
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white text-center font-bold tracking-widest mb-4 text-gray-800"
          />
          <button type="submit" className="w-full py-3.5 bg-[#D31329] hover:bg-[#b01020] text-white font-bold rounded-2xl transition-all active:scale-95 shadow-md">
            Entsperren
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-[#1D1D1F] dark:text-zinc-100 p-8 font-sans antialiased flex flex-col justify-between selection:bg-[#D31329] selection:text-white transition-colors duration-500">
        
        {/* Haupt-Inhalt */}
        <div>
          <header className="flex justify-between items-center mb-8 border-b pb-6 border-gray-200 dark:border-zinc-800">
            <div className="flex items-center gap-4">
              <Link href="/" className="h-8 w-8 rounded-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-800 flex items-center justify-center text-sm font-bold text-gray-600 dark:text-zinc-300 transition-all active:scale-90">←</Link>
              <div className="flex items-center gap-3">
                <img src="/logo.png" alt="St. Ursula Villingen" className="h-10 w-auto object-contain rounded dark:brightness-110" onError={(e) => { e.target.style.display = 'none'; }} />
                <div>
                  <h1 className="text-3xl font-extrabold tracking-tight text-[#D31329]">Systemsteuerung</h1>
                  <p className="text-sm text-gray-400 dark:text-zinc-500 font-semibold tracking-wider uppercase mt-1">St. Ursula Weltladen • Villingen</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <span className="text-base font-bold text-gray-800 dark:text-zinc-200 font-mono tracking-widest">{liveTime || '00:00:00'}</span>
                <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-wider">{liveDate || 'Lade Datum...'}</p>
              </div>
              <button onClick={toggleTheme} className="h-8 w-8 rounded-full border border-gray-300 dark:border-zinc-800 flex items-center justify-center text-sm shadow-sm">{isDarkMode ? '☀️' : '🌙'}</button>
              <button onClick={handleLogout} className="px-4 py-2 bg-red-50 hover:bg-red-100 text-[#D31329] font-bold rounded-xl text-xs uppercase tracking-wider transition-all">Abmelden</button>
              
              <select value={selectedPeriodId} onChange={(e) => setSelectedPeriodId(e.target.value)} className="bg-white border border-gray-200 dark:border-zinc-800 px-4 py-2.5 rounded-2xl shadow-sm font-semibold text-gray-700 dark:text-zinc-300 outline-none">
                {periods.map(p => (
                  <option key={p._id} value={p._id}>
                    {p.name} ({p.startDate} bis {p.endDate})
                  </option>
                ))}
              </select>
            </div>
          </header>

          {/* KPI Dashboard */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 dark:bg-zinc-900 rounded-3xl border border-gray-150 dark:border-zinc-800 shadow-sm"><p className="text-xs text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-wider">Umsatz (Brutto)</p><p className="text-3xl font-extrabold text-[#D31329] mt-2">{stats.totalRevenue.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</p></div>
            <div className="bg-white p-6 dark:bg-zinc-900 rounded-3xl border border-gray-150 dark:border-zinc-800 shadow-sm"><p className="text-xs text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-wider">Umsatz (Netto)</p><p className="text-3xl font-extrabold text-[#8E8E93] mt-2">{stats.totalNetto?.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }) || '0,00 €'}</p></div>
            <div className="bg-white p-6 dark:bg-zinc-900 rounded-3xl border border-gray-150 dark:border-zinc-800 shadow-sm"><p className="text-xs text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-wider">Belege gesamt</p><p className="text-3xl font-extrabold mt-2 text-gray-700 dark:text-zinc-200">{stats.salesCount} Belege</p></div>
          </div>

          <div className="grid grid-cols-12 gap-8 mb-8">
            <section className="col-span-6 bg-white p-6 rounded-3xl border border-gray-200/50 dark:border-zinc-800 shadow-sm h-[380px] flex flex-col justify-between">
              <h2 className="text-lg font-bold text-[#D31329] mb-6">Best-Selling Products</h2>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bestSellers}>
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#86868B' }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="totalSold" fill="#D31329" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* SYSTEMSTEUERUNG */}
            <section className="col-span-6 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-gray-200/50 dark:border-zinc-800 shadow-sm h-[380px] flex flex-col justify-between">
              <h2 className="text-lg font-bold text-[#D31329]">Kassensystem konfigurieren</h2>
              <form onSubmit={handleSaveConfig} className="flex flex-col gap-4 mt-4 h-full justify-between">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between bg-[#F5F5F7] dark:bg-zinc-950 p-3 rounded-xl border dark:border-zinc-850">
                    <span className="text-xs font-bold uppercase text-gray-500 dark:text-zinc-400 tracking-wider">Aktionsbanner anzeigen?</span>
                    <input type="checkbox" checked={bannerActive} onChange={(e) => setBannerActive(e.target.checked)} className="h-5 w-5 text-[#D31329] focus:ring-[#D31329]" />
                  </div>
                  <div className="flex items-center justify-between bg-red-50 dark:bg-red-950/10 p-3 rounded-xl border border-red-100 dark:border-red-900/30">
                    <span className="text-xs font-bold uppercase text-red-600 tracking-wider">⚠️ Systemweiten Wartungsmodus aktivieren?</span>
                    <input type="checkbox" checked={maintenanceActive} onChange={(e) => setMaintenanceActive(e.target.checked)} className="h-5 w-5 text-red-600 focus:ring-red-500" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Banner Nachricht</label>
                  <textarea value={bannerMessage} onChange={(e) => setBannerMessage(e.target.value)} rows="2" className="w-full px-4 py-2 border dark:border-zinc-800 rounded-xl font-medium bg-white dark:bg-zinc-950 text-gray-800 dark:text-zinc-100" placeholder="Nachricht an der Kasse einblenden..." />
                </div>
                <button type="submit" className="w-full py-3.5 bg-[#D31329] hover:bg-[#b01020] text-white font-bold rounded-2xl transition-all">Konfigurationen speichern</button>
              </form>
            </section>
          </div>

          {/* ABRECHNUNGSZEITRÄUME VERWALTEN */}
          <div className="grid grid-cols-12 gap-8 mb-8">
            <section className="col-span-12 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-gray-200/50 dark:border-zinc-800 shadow-sm">
              <h2 className="text-lg font-bold text-[#D31329] mb-4">Abrechnungszeiträume verwalten</h2>
              <div className="grid grid-cols-12 gap-6">
                
                {/* Creator Form */}
                <form onSubmit={handleCreatePeriod} className="col-span-5 flex flex-col gap-4 border-r dark:border-zinc-800 pr-6">
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Zeitraum Name</label>
                    <input type="text" value={newPeriodName} onChange={(e) => setNewPeriodName(e.target.value)} placeholder="z. B. 3. Quartal (Q3)" className="w-full px-4 py-2 border dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-xl font-medium text-gray-850 dark:text-zinc-100" required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Startdatum</label>
                      <input type="date" value={newStartDate} onChange={(e) => setNewStartDate(e.target.value)} className="w-full px-4 py-2 border dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-xl font-medium text-gray-850 dark:text-zinc-100" required />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Enddatum</label>
                      <input type="date" value={newEndDate} onChange={(e) => setNewEndDate(e.target.value)} className="w-full px-4 py-2 border dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-xl font-medium text-gray-850 dark:text-zinc-100" required />
                    </div>
                  </div>
                  <button type="submit" className="w-full py-3 bg-[#D31329] hover:bg-[#b01020] text-white font-bold rounded-xl shadow-md transition-all">Zeitraum erstellen</button>
                </form>

                {/* List and Delete */}
                <div className="col-span-7 overflow-y-auto max-h-64">
                  <table className="w-full text-left border-collapse">
                    <thead><tr className="border-b dark:border-zinc-800 text-xs text-gray-400 uppercase tracking-wider font-bold"><th className="py-2">Name</th><th>Start</th><th>Ende</th><th className="text-right">Aktionen</th></tr></thead>
                    <tbody>
                      {periods.map(p => (
                        <tr key={p._id} className="border-b dark:border-zinc-800 text-sm">
                          <td className="font-bold py-2">{p.name}</td>
                          <td className="font-mono text-xs text-gray-500">{p.startDate}</td>
                          <td className="font-mono text-xs text-gray-500">{p.endDate}</td>
                          <td className="text-right py-1">
                            <button onClick={() => handleDeletePeriod(p._id)} className="px-3 py-1 bg-red-50 text-red-600 font-bold rounded-lg text-xs uppercase hover:bg-red-100">Löschen</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </div>

          <div className="grid grid-cols-12 gap-8 mb-8">
            {/* Neues Produkt anlegen */}
            <section className="col-span-12 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-gray-200/50 dark:border-zinc-800 shadow-sm">
              <h2 className="text-lg font-bold text-[#D31329] mb-6">Neues Produkt hinzufügen</h2>
              <form onSubmit={handleAddProduct} className="grid grid-cols-4 gap-4">
                <input type="text" name="pname" placeholder="Produktname" className="px-4 py-3 rounded-xl border dark:border-zinc-800 bg-white dark:bg-zinc-950 text-gray-800 dark:text-zinc-100 font-medium focus:ring-2 focus:ring-[#D31329]/20 focus:border-[#D31329] outline-none" required />
                <select name="pgroup" className="px-4 py-3 rounded-xl border dark:border-zinc-800 bg-white dark:bg-zinc-950 text-gray-800 dark:text-zinc-100 font-medium focus:ring-2 focus:ring-[#D31329]/20 focus:border-[#D31329] outline-none"><option value="Lebensmittel">Lebensmittel</option><option value="Unverpackt; Lebensmittel">Unverpackt; Lebensmittel</option><option value="Schreibwaren">Schreibwaren</option><option value="Sonstige">Sonstige</option></select>
                <input type="number" step="0.05" name="pprice" placeholder="Preis (€)" className="px-4 py-3 rounded-xl border dark:border-zinc-800 bg-white dark:bg-zinc-950 text-gray-800 dark:text-zinc-100 font-medium focus:ring-2 focus:ring-[#D31329]/20 focus:border-[#D31329] outline-none" required />
                <select name="pvat" className="px-4 py-3 rounded-xl border dark:border-zinc-800 bg-white dark:bg-zinc-950 text-gray-800 dark:text-zinc-100 font-medium focus:ring-2 focus:ring-[#D31329]/20 focus:border-[#D31329] outline-none"><option value={7}>7% (Essen)</option><option value={19}>19% (Zubehör)</option></select>
                <button type="submit" className="col-span-4 py-3.5 bg-[#D31329] hover:bg-[#b01020] text-white font-bold rounded-xl shadow-md transition-all">Produkt hinzufügen</button>
              </form>
            </section>
          </div>

          <div className="grid grid-cols-12 gap-8 mb-8">
            <section className="col-span-12 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-gray-200/50 dark:border-zinc-800 shadow-sm mb-8 animate-fade-in">
              <h2 className="text-lg font-bold text-[#D31329] mb-4">Editierbares Produktregister</h2>
              <div className="overflow-y-auto max-h-72">
                <table className="w-full text-left border-collapse">
                  <thead><tr className="border-b dark:border-zinc-800 text-xs text-gray-400 uppercase tracking-wider font-bold"><th className="py-3">Nr.</th><th>Bezeichnung</th><th>Warengruppe</th><th className="text-center">MwSt.</th><th className="text-right">Preis (€)</th><th className="text-right">Aktionen</th></tr></thead>
                  <tbody>
                    {products.map((p) => (
                      <tr key={p._id} className="border-b dark:border-zinc-800 text-sm"><td className="py-3 font-mono text-xs text-gray-400">{p.nr}</td><td className="font-bold text-gray-800 dark:text-zinc-100">{p.name}</td><td><span className="text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full uppercase">{p.group}</span></td><td className="text-center text-gray-500 font-mono">{p.vatRate}%</td><td className="text-right py-1"><input type="number" step="0.05" defaultValue={p.basePrice} onBlur={(e) => handlePriceUpdate(p._id, e.target.value)} className="w-20 text-right border dark:border-zinc-800 bg-white dark:bg-zinc-950 text-gray-800 dark:text-zinc-100 rounded-xl px-2 py-1 font-bold focus:ring-2 focus:ring-[#D31329]/20 focus:border-[#D31329] outline-none" /></td><td className="text-right py-1"><button onClick={() => handleDeleteProduct(p._id)} className="px-3 py-1 bg-red-50 text-red-600 font-bold rounded-lg text-xs uppercase tracking-wider hover:bg-red-100">Löschen</button></td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <div className="grid grid-cols-12 gap-8 mb-8">
            <section className="col-span-12 bg-white p-6 dark:bg-zinc-900 rounded-3xl border border-gray-200/50 dark:border-zinc-800 shadow-sm mb-8 animate-fade-in">
              <h2 className="text-lg font-bold text-[#D31329] mb-4">Transaktionsjournal</h2>
              <p className="text-xs text-gray-400 mb-6 font-medium">Zeigt genau die Belege an, die zum oben ausgewählten Abrechnungszeitraum gehören.</p>
              <div className="overflow-y-auto max-h-96">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b dark:border-zinc-800 text-xs text-gray-400 uppercase tracking-wider font-bold">
                      <th className="py-3">Abrechnungsdatum</th>
                      <th>Bon-ID</th>
                      <th>Artikel</th>
                      <th>Status</th>
                      <th className="text-right">Summe (Brutto)</th>
                      <th className="text-right">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredSales().map((sale) => (
                      <tr key={sale._id} className={`border-b dark:border-zinc-800 text-sm ${sale.storno ? 'bg-red-50/30 line-through text-gray-400' : ''}`}>
                        <td className="py-3 font-mono text-xs">{sale.saleDate} • {safeFormatTime(sale.createdAt)} Uhr</td>
                        <td className="font-mono text-xs text-gray-400">{sale._id.slice(-6).toUpperCase()}</td>
                        <td>
                          <div className="flex flex-col gap-1">
                            {sale.items.map((item, i) => (
                              <span key={i} className="text-xs font-semibold">
                                {item.quantity}x {item.name} ({item.priceAtSale.toFixed(2)} €)
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          {sale.storno ? (
                            <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full uppercase">Storniert</span>
                          ) : (
                            <span className="text-[10px] font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full uppercase">{sale.status}</span>
                          )}
                        </td>
                        <td className="text-right font-bold text-[#D31329]">{sale.totalBrutto.toFixed(2)} €</td>
                        <td className="text-right py-2">
                          {!sale.storno && (
                            <button 
                              onClick={() => handleJournalStorno(sale._id)}
                              className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-600 font-bold rounded-lg text-xs uppercase tracking-wider"
                            >
                              Stornieren
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>

        {/* COOLE KINO-SPALT-ÖFFNUNGS-ANIMATION (Wird beim Laden der Admin-Zentrale eingeblendet) */}
        {isTransitioning && (
          <div className="fixed inset-0 z-50 overflow-hidden flex select-none pointer-events-auto">
            {/* Linker Tor-Flügel */}
            <div 
              className={`w-1/2 h-full bg-[#0B2F5C] border-r border-[#F2B600]/10 flex justify-end items-center transition-transform duration-1000 ease-in-out ${
                startSplitting ? '-translate-x-full' : 'translate-x-0'
              }`}
            >
              <div className={`h-full w-px bg-[#F2B600]/40 transition-opacity duration-300 ${startSplitting ? 'opacity-0' : 'opacity-100'}`} />
            </div>

            {/* Rechter Tor-Flügel */}
            <div 
              className={`w-1/2 h-full bg-[#0B2F5C] border-l border-[#F2B600]/10 flex justify-start items-center transition-transform duration-1000 ease-in-out ${
                startSplitting ? 'translate-x-full' : 'translate-x-0'
              }`}
            >
              <div className={`h-full w-px bg-[#F2B600]/40 transition-opacity duration-300 ${startSplitting ? 'opacity-0' : 'opacity-100'}`} />
            </div>

            {/* Mittig schwebendes, pulsierendes Regenbogen-Logo */}
            <div 
              className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 transition-all duration-700 ease-in-out ${
                startSplitting ? 'opacity-0 scale-90' : 'opacity-100 scale-100'
              }`}
            >
              <div className="p-4 bg-white dark:bg-zinc-900 rounded-full shadow-[0_0_50px_rgba(211,19,41,0.25)] animate-pulse-glow">
                <img 
                  src="/logo.png" 
                  alt="Weltladen Logo" 
                  className="h-28 w-28 object-contain rounded-full"
                />
              </div>
            </div>
          </div>
        )}

        {/* Copyright Footer */}
        <footer className="mt-8 py-5 text-center text-[10px] text-gray-400 dark:text-zinc-650 font-bold uppercase tracking-wider bg-white dark:bg-zinc-950 border-t border-gray-150 dark:border-zinc-800">
          © 2026 Schülerfirma Weltladen St. Ursula Villingen. Alle Rechte vorbehalten für Jill Manuel Hils.
        </footer>
      </div>
    </div>
  );
};

// EXPORT MIT AUSSCHLIESSLICHEM CLIENT-RENDERING (Verhindert jegliche Prerender-Fehler auf Vercel!)
export default dynamic(() => Promise.resolve(AdminDashboardComponent), { ssr: false });