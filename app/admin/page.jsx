// app/admin/page.jsx
'use client';
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');
  
  const [stats, setStats] = useState({ totalRevenue: 0, salesCount: 0, totalNetto: 0 });
  const [bestSellers, setBestSellers] = useState([]);
  const [products, setProducts] = useState([]);
  const [salesJournal, setSalesJournal] = useState([]);
  const [selectedQuarter, setSelectedQuarter] = useState('q2'); // <--- HIER KORRIGIERT! Startet direkt mit dem 2. Quartal (Q2)
  const [liveTime, setLiveTime] = useState('');

  // System-Config States
  const [bannerActive, setBannerActive] = useState(false);
  const [bannerMessage, setBannerMessage] = useState('');
  const [maintenanceActive, setMaintenanceActive] = useState(false);

  useEffect(() => {
    const auth = localStorage.getItem('admin_auth');
    if (auth === 'true') setIsAuthenticated(true);
  }, []);

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
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const loadData = () => {
    fetch(`/api/admin/stats?quarter=${selectedQuarter}`)
      .then(res => res.json())
      .then(data => {
        if (data.summary) setStats(data.summary);
        if (data.bestSellers) setBestSellers(data.bestSellers);
      })
      .catch(err => console.error(err));

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

  useEffect(() => {
    if (isAuthenticated) loadData();
  }, [selectedQuarter, isAuthenticated]);

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
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: e.target.pname.value, group: e.target.pgroup.value, basePrice: parseFloat(e.target.pprice.value), vatRate: parseInt(e.target.pvat.value) })
    });
    if (res.ok) { e.target.reset(); loadData(); }
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
      body: JSON.stringify({ 
        bannerActive, 
        bannerMessage, 
        maintenanceActive 
      })
    });
    if (res.ok) {
      alert("Systemkonfiguration erfolgreich aktualisiert!");
    }
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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center font-sans">
        <form onSubmit={handleLogin} className="bg-white/80 backdrop-blur-md p-10 rounded-3xl shadow-xl max-w-sm w-full border border-white/20 text-center animate-fade-in">
          <span className="text-4xl mb-4 block">🔒</span>
          <h2 className="text-xl font-bold text-[#0B2F5C] mb-2 tracking-tight">Admin-Bereich geschützt</h2>
          <p className="text-xs text-gray-400 mb-6 font-semibold uppercase tracking-wider">St. Ursula Weltladen Villingen</p>
          <input 
            type="password" 
            placeholder="Kennwort eingeben..."
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-4 focus:ring-[#0B2F5C]/10 focus:border-[#0B2F5C] text-center font-bold tracking-widest mb-4"
          />
          <button type="submit" className="w-full py-3.5 bg-[#0B2F5C] hover:bg-[#153e61] text-white font-bold rounded-2xl transition-all active:scale-95 shadow-md">Entsperren</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] p-8 font-sans antialiased">
      <header className="flex justify-between items-center mb-8 border-b pb-6 border-gray-200">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#0B2F5C]">Systemsteuerung</h1>
          <p className="text-sm text-gray-400 font-semibold tracking-wider uppercase mt-1">St. Ursula Weltladen • Villingen</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <span className="text-base font-bold text-gray-800 font-mono tracking-widest">{liveTime || '00:00:00'}</span>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{new Date().toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'short' })}</p>
          </div>
          <button onClick={handleLogout} className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl text-xs uppercase tracking-wider transition-all">Abmelden</button>
          <select value={selectedQuarter} onChange={(e) => setSelectedQuarter(e.target.value)} className="bg-white border border-gray-200 px-4 py-2.5 rounded-2xl shadow-sm font-semibold text-gray-700 outline-none">
            <option value="testphase">Testphase (15.12.25 - 31.01.26)</option>
            <option value="q1">1. Quartal (Q1) (01.01.26 - 12.03.26)</option>
            <option value="q2">2. Quartal (Q2) (12.03.26 - 11.06.26)</option>
          </select>
        </div>
      </header>

      {/* KPI Dashboard */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm"><p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Umsatz (Brutto)</p><p className="text-3xl font-extrabold text-[#0B2F5C] mt-2">{stats.totalRevenue.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</p></div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm"><p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Umsatz (Netto)</p><p className="text-3xl font-extrabold text-[#F2B600] mt-2">{stats.totalNetto?.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }) || '0,00 €'}</p></div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm"><p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Belege gesamt</p><p className="text-3xl font-extrabold mt-2 text-gray-700">{stats.salesCount} Belege</p></div>
      </div>

      <div className="grid grid-cols-12 gap-8 mb-8">
        <section className="col-span-6 bg-white p-6 rounded-3xl border border-gray-200/50 shadow-sm h-[380px] flex flex-col justify-between">
          <h2 className="text-lg font-bold text-[#0B2F5C] mb-6">Best-Selling Products</h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bestSellers}>
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#86868B' }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="totalSold" fill="#0B2F5C" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* SYSTEMSTEUERUNG (BANNER & WARTUNGSMODUS) */}
        <section className="col-span-6 bg-white p-6 rounded-3xl border border-gray-200/50 shadow-sm h-[380px] flex flex-col justify-between">
          <h2 className="text-lg font-bold text-[#0B2F5C]">Kassensystem konfigurieren</h2>
          <form onSubmit={handleSaveConfig} className="flex flex-col gap-4 mt-4 h-full justify-between">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between bg-[#F5F5F7] p-3 rounded-xl border">
                <span className="text-xs font-bold uppercase text-gray-500 tracking-wider">Aktionsbanner anzeigen?</span>
                <input type="checkbox" checked={bannerActive} onChange={(e) => setBannerActive(e.target.checked)} className="h-5 w-5 text-[#0B2F5C] focus:ring-[#0B2F5C]" />
              </div>
              <div className="flex items-center justify-between bg-red-50 p-3 rounded-xl border border-red-100">
                <span className="text-xs font-bold uppercase text-red-600 tracking-wider">⚠️ Systemweiten Wartungsmodus aktivieren?</span>
                <input type="checkbox" checked={maintenanceActive} onChange={(e) => setMaintenanceActive(e.target.checked)} className="h-5 w-5 text-red-600 focus:ring-red-500" />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Banner Nachricht</label>
              <textarea value={bannerMessage} onChange={(e) => setBannerMessage(e.target.value)} rows="2" className="w-full px-4 py-2 border rounded-xl font-medium" placeholder="Nachricht an der Kasse einblenden..." />
            </div>
            <button type="submit" className="w-full py-3.5 bg-[#F2B600] hover:bg-[#d49e1e] text-white font-bold rounded-2xl transition-all">Konfigurationen speichern</button>
          </form>
        </section>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Neues Produkt anlegen */}
        <section className="col-span-12 bg-white p-6 rounded-3xl border border-gray-200/50 shadow-sm">
          <h2 className="text-lg font-bold text-[#0B2F5C] mb-6">Neues Produkt hinzufügen</h2>
          <form onSubmit={handleAddProduct} className="grid grid-cols-4 gap-4">
            <input type="text" name="pname" placeholder="Produktname" className="px-4 py-3 rounded-xl border font-medium" required />
            <select name="pgroup" className="px-4 py-3 rounded-xl border font-medium"><option value="Lebensmittel">Lebensmittel</option><option value="Unverpackt; Lebensmittel">Unverpackt; Lebensmittel</option><option value="Schreibwaren">Schreibwaren</option><option value="Sonstige">Sonstige</option></select>
            <input type="number" step="0.05" name="pprice" placeholder="Preis (€)" className="px-4 py-3 rounded-xl border font-medium" required />
            <select name="pvat" className="px-4 py-3 rounded-xl border font-medium"><option value={7}>7% (Essen)</option><option value={19}>19% (Zubehör)</option></select>
            <button type="submit" className="col-span-4 py-3.5 bg-[#0B2F5C] hover:bg-[#153e63] text-white font-bold rounded-xl shadow-md">Produkt hinzufügen</button>
          </form>
        </section>

        {/* Editierbares Produktregister */}
        <section className="col-span-12 bg-white p-6 rounded-3xl border border-gray-200/50 shadow-sm">
          <h2 className="text-lg font-bold text-[#0B2F5C] mb-4">Editierbares Produktregister</h2>
          <div className="overflow-y-auto max-h-72">
            <table className="w-full text-left border-collapse">
              <thead><tr className="border-b text-xs text-gray-400 uppercase tracking-wider font-bold"><th className="py-3">Nr.</th><th>Bezeichnung</th><th>Warengruppe</th><th className="text-center">MwSt.</th><th className="text-right">Preis (€)</th><th className="text-right">Aktionen</th></tr></thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p._id} className="border-b text-sm"><td className="py-3 font-mono text-xs text-gray-400">{p.nr}</td><td className="font-bold text-gray-800">{p.name}</td><td><span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full uppercase">{p.group}</span></td><td className="text-center text-gray-500 font-mono">{p.vatRate}%</td><td className="text-right py-1"><input type="number" step="0.05" defaultValue={p.basePrice} onBlur={(e) => handlePriceUpdate(p._id, e.target.value)} className="w-20 text-right border rounded-xl px-2 py-1 font-bold text-gray-800" /></td><td className="text-right py-1"><button onClick={() => handleDeleteProduct(p._id)} className="px-3 py-1 bg-red-50 text-red-600 font-bold rounded-lg text-xs uppercase tracking-wider">Löschen</button></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Transaktionsjournal */}
        <section className="col-span-12 bg-white p-6 rounded-3xl border border-gray-200/50 shadow-sm">
          <h2 className="text-lg font-bold text-[#0B2F5C] mb-4">Transaktionsjournal</h2>
          <div className="overflow-y-auto max-h-96">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b text-xs text-gray-400 uppercase tracking-wider font-bold">
                  <th className="py-3">Datum & Uhrzeit</th>
                  <th>Bon-ID</th>
                  <th>Artikel</th>
                  <th>Status</th>
                  <th className="text-right">Summe (Brutto)</th>
                  <th className="text-right">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {salesJournal.map((sale) => (
                  <tr key={sale._id} className={`border-b text-sm ${sale.storno ? 'bg-red-50/30 line-through text-gray-400' : ''}`}>
                    <td className="py-3 font-mono text-xs">{new Date(sale.createdAt).toLocaleString('de-DE')}</td>
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
                    <td className="text-right font-bold text-[#0B2F5C]">{sale.totalBrutto.toFixed(2)} €</td>
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
  );
}