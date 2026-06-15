'use client';
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ totalRevenue: 0, salesCount: 0, totalNetto: 0 });
  const [bestSellers, setBestSellers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedQuarter, setSelectedQuarter] = useState('2026-Q2');
  const [liveTime, setLiveTime] = useState('');

  // Formular-State für neues Produkt
  const [newName, setNewName] = useState('');
  const [newGroup, setNewGroup] = useState('Lebensmittel');
  const [newPrice, setNewPrice] = useState('');
  const [newVat, setNewVat] = useState(7);

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

  // Statistiken und Produktregister laden
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
      .then(data => {
        if (data.products) setProducts(data.products);
      })
      .catch(err => console.error(err));
  };

  useEffect(() => {
    loadData();
  }, [selectedQuarter]);

  // CRUD: Preis live im Register anpassen
  const handlePriceUpdate = async (id, newPrice) => {
    if (!newPrice || isNaN(newPrice)) return;
    const res = await fetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price: parseFloat(newPrice) })
    });
    if (res.ok) {
      loadData();
    }
  };

  // CRUD: Neues Produkt anlegen
  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!newName || !newPrice) return;

    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newName,
        group: newGroup,
        basePrice: parseFloat(newPrice),
        vatRate: parseInt(newVat)
      })
    });

    if (res.ok) {
      setNewName('');
      setNewPrice('');
      loadData();
      alert("Produkt erfolgreich hinzugefügt!");
    }
  };

  // CRUD: Produkt löschen (Soft-Delete)
  const handleDeleteProduct = async (id) => {
    if (!confirm("Möchtest du dieses Produkt wirklich aus dem Register löschen?")) return;
    const res = await fetch(`/api/products/${id}`, {
      method: 'DELETE'
    });
    if (res.ok) {
      loadData();
      alert("Produkt wurde gelöscht.");
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] p-8 font-sans antialiased">
      {/* Admin Navigation Bar */}
      <header className="flex justify-between items-center mb-8 border-b pb-6 border-gray-200">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#0D2B45]">Systemsteuerung</h1>
          <p className="text-sm text-gray-400 font-semibold tracking-wider uppercase mt-1">St. Ursula Weltladen • Villingen</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <span className="text-base font-bold text-gray-800 font-mono tracking-widest">{liveTime || '00:00:00'}</span>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{new Date().toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'short' })}</p>
          </div>
          <select 
            value={selectedQuarter} 
            onChange={(e) => setSelectedQuarter(e.target.value)}
            className="bg-white border border-gray-200 px-4 py-2.5 rounded-2xl shadow-sm focus:ring-4 focus:ring-[#0D2B45]/10 focus:border-[#0D2B45] text-sm font-semibold text-gray-700 outline-none transition-all"
          >
            <option value="2026-Q1">1. Quartal 2026</option>
            <option value="2026-Q2">2. Quartal 2026</option>
            <option value="2026-Q3">3. Quartal 2026</option>
          </select>
        </div>
      </header>

      {/* KPI Dashboard Widgets */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Umsatz (Brutto)</p>
          <p className="text-3xl font-extrabold text-[#0D2B45] mt-2">
            {stats.totalRevenue.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
          </p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Umsatz abzg. MwSt. (Netto)</p>
          <p className="text-3xl font-extrabold text-[#E6AF2E] mt-2">
            {stats.totalNetto?.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }) || '0,00 €'}
          </p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Kassierte Belege</p>
          <p className="text-3xl font-extrabold mt-2 text-gray-700">{stats.salesCount} Belege</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Diagramm */}
        <section className="col-span-5 bg-white p-6 rounded-3xl border border-gray-200/50 shadow-sm flex flex-col justify-between">
          <h2 className="text-lg font-bold text-[#0D2B45] mb-6 tracking-tight">Best-Selling Products</h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bestSellers}>
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#86868B' }} axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#86868B' }} />
                <Tooltip cursor={{ fill: 'rgba(13,43,69,0.02)' }} />
                <Bar dataKey="totalSold" fill="#0D2B45" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Neues Produkt anlegen */}
        <section className="col-span-7 bg-white p-6 rounded-3xl border border-gray-200/50 shadow-sm">
          <h2 className="text-lg font-bold text-[#0D2B45] mb-6 tracking-tight">Neues Produkt hinzufügen</h2>
          <form onSubmit={handleAddProduct} className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Produktname</label>
              <input 
                type="text" 
                value={newName} 
                onChange={(e) => setNewName(e.target.value)} 
                placeholder="z.B. Faire Schokolade"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-4 focus:ring-[#0D2B45]/5 focus:border-[#0D2B45] font-medium"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Kategorie</label>
              <select 
                value={newGroup} 
                onChange={(e) => setNewGroup(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-4 focus:ring-[#0D2B45]/5 focus:border-[#0D2B45] font-medium text-gray-700"
              >
                <option value="Lebensmittel">Lebensmittel</option>
                <option value="Unverpackt; Lebensmittel">Unverpackt; Lebensmittel</option>
                <option value="Schreibwaren">Schreibwaren</option>
                <option value="Sonstige">Sonstige</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Standardpreis (€)</label>
              <input 
                type="number" 
                step="0.05"
                value={newPrice} 
                onChange={(e) => setNewPrice(e.target.value)} 
                placeholder="1,50"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-4 focus:ring-[#0D2B45]/5 focus:border-[#0D2B45] font-medium"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">MwSt-Satz (%)</label>
              <select 
                value={newVat} 
                onChange={(e) => setNewVat(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-4 focus:ring-[#0D2B45]/5 focus:border-[#0D2B45] font-medium text-gray-700"
              >
                <option value={7}>7% (Lebensmittel)</option>
                <option value={19}>19% (Schreibwaren/Sonstige)</option>
              </select>
            </div>
            <button 
              type="submit" 
              className="col-span-2 mt-2 py-3.5 bg-[#0D2B45] hover:bg-[#1a4163] text-white font-bold rounded-xl shadow-md transition-all active:scale-98"
            >
              Artikel anlegen
            </button>
          </form>
        </section>

        {/* Live-Produktregister (Bearbeitbar) */}
        <section className="col-span-12 bg-white p-6 rounded-3xl border border-gray-200/50 shadow-sm flex flex-col">
          <h2 className="text-lg font-bold text-[#0D2B45] mb-4 tracking-tight">Editierbares Produktregister</h2>
          <div className="overflow-y-auto max-h-96 pr-2">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wider font-bold">
                  <th className="py-3">Nr.</th>
                  <th>Produktbezeichnung</th>
                  <th>Warengruppe</th>
                  <th className="text-center">MwSt.</th>
                  <th className="text-right">Preis (€)</th>
                  <th className="text-right">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors text-sm">
                    <td className="py-3 font-mono text-xs text-gray-400">{p.nr}</td>
                    <td className="font-bold text-gray-800">{p.name}</td>
                    <td>
                      <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full uppercase">{p.group}</span>
                    </td>
                    <td className="text-center text-gray-500 font-mono">{p.vatRate}%</td>
                    <td className="text-right py-1">
                      <input 
                        type="number" 
                        step="0.05"
                        defaultValue={p.basePrice}
                        onBlur={(e) => handlePriceUpdate(p._id, e.target.value)}
                        className="w-20 text-right border border-gray-200 rounded-xl px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#0D2B45]/20 focus:border-[#0D2B45] font-bold text-gray-800"
                      />
                    </td>
                    <td className="text-right py-1">
                      <button 
                        onClick={() => handleDeleteProduct(p._id)}
                        className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-lg text-xs transition-all uppercase tracking-wider"
                      >
                        Löschen
                      </button>
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