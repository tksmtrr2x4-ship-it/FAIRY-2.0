// app/admin/page.jsx
'use client';
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ totalRevenue: 0, salesCount: 0, totalNetto: 0 });
  const [bestSellers, setBestSellers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedQuarter, setSelectedQuarter] = useState('2026-Q2');

  useEffect(() => {
    // Umsatz- & Bestsellerstatistiken abrufen
    fetch(`/api/admin/stats?quarter=${selectedQuarter}`)
      .then(res => res.json())
      .then(data => {
        if (data.summary) setStats(data.summary);
        if (data.bestSellers) setBestSellers(data.bestSellers);
      })
      .catch(err => console.error(err));

    // Produktregister abrufen
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        if (data.products) setProducts(data.products);
      })
      .catch(err => console.error(err));
  }, [selectedQuarter]);

  const updatePrice = async (id, newPrice) => {
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: parseFloat(newPrice) })
      });
      if (res.ok) alert("Preis erfolgreich aktualisiert!");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] p-8">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ursulaNavy">Admin-Zentrale</h1>
          <p className="text-sm text-gray-500">St. Ursula Weltladen • Performance & Registersteuerung</p>
        </div>
        <select 
          value={selectedQuarter} 
          onChange={(e) => setSelectedQuarter(e.target.value)}
          className="bg-white border border-gray-200 px-4 py-2 rounded-xl shadow-sm focus:ring-2 focus:ring-ursulaNavy"
        >
          <option value="2026-Q1">1. Quartal 2026</option>
          <option value="2026-Q2">2. Quartal 2026 (Aktuell)</option>
          <option value="2026-Q3">3. Quartal 2026</option>
        </select>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Gesamtumsatz (Brutto)</p>
          <p className="text-2xl font-bold text-ursulaNavy mt-2">
            {stats.totalRevenue.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Umsatz abzg. MwSt. (Netto)</p>
          <p className="text-2xl font-bold text-fairtradeAmber mt-2">
            {stats.totalNetto?.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }) || '0,00 €'}
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Anzahl Belege</p>
          <p className="text-2xl font-bold mt-2 text-gray-700">{stats.salesCount} Bons</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Recharts Bestseller-Diagramm */}
        <div className="col-span-6 bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
          <h2 className="text-lg font-semibold mb-6">Bestseller Produkte</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bestSellers}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="totalSold" fill="#0D2B45" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Registersteuerung */}
        <div className="col-span-6 bg-white p-6 rounded-3xl border border-gray-200 shadow-sm flex flex-col">
          <h2 className="text-lg font-semibold mb-4">Preis- & Artikelverwaltung</h2>
          <div className="overflow-y-auto max-h-72 pr-2">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b text-xs text-gray-400 uppercase">
                  <th className="py-2">Art.</th>
                  <th>Produktname</th>
                  <th>Gruppe</th>
                  <th className="text-right">Preis (€)</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p._id} className="border-b hover:bg-gray-50 text-sm">
                    <td className="py-2 font-mono text-xs">{p.nr}</td>
                    <td className="font-medium">{p.name}</td>
                    <td className="text-gray-400 text-xs">{p.group}</td>
                    <td className="text-right py-1">
                      <input 
                        type="number" 
                        step="0.05"
                        defaultValue={p.basePrice}
                        onBlur={(e) => updatePrice(p._id, e.target.value)}
                        className="w-16 text-right border rounded px-1 focus:ring-1 focus:ring-ursulaNavy"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}