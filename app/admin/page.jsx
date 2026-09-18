// app/admin/page.jsx - [Admin-Dashboard mit dynamic SSR: false, Apple-Lösch-Modal und Toast-Rückmeldung]
'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import SiteFooter from '../components/SiteFooter';
import { KLEINUNTERNEHMER, KLEINUNTERNEHMER_HINWEIS } from '@/lib/tax';

const ResponsiveContainer = dynamic(() => import('recharts').then((mod) => mod.ResponsiveContainer), { ssr: false });
const BarChart = dynamic(() => import('recharts').then((mod) => mod.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then((mod) => mod.Bar), { ssr: false });
const XAxis = dynamic(() => import('recharts').then((mod) => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then((mod) => mod.YAxis), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then((mod) => mod.Tooltip), { ssr: false });

const AdminDashboardComponent = () => {
  // Wer diese Seite sieht, ist von der Middleware bereits geprüft worden.
  // Das frühere Kennwort im Browser-Bundle ist ersatzlos entfallen.
  const [isAuthenticated] = useState(true);
  const [protection, setProtection] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const [stats, setStats] = useState({ totalRevenue: 0, salesCount: 0, totalNetto: 0, totalVat: 0 });
  const [bestSellers, setBestSellers] = useState([]);
  const [slowSellers, setSlowSellers] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [dailyRevenue, setDailyRevenue] = useState([]);
  const [vatBreakdown, setVatBreakdown] = useState([]);
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

  // Cinematic Loading, Delete Modal & Success Toast States
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [startSplitting, setStartSplitting] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [editFields, setEditFields] = useState({});
  const [lastAddedProduct, setLastAddedProduct] = useState('');

  const euro = (value) =>
    (Number.isFinite(value) ? value : 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });

  // 'pause1' und 'pause2' stammen aus der Zeit der getrennten Pausen. Sie werden
  // in der Datenbank NICHT verändert, hier aber gemeinsam mit dem neuen 'pause'
  // als "Pause" angezeigt. Der Rohwert bleibt daneben sichtbar.
  const STATUS_LABEL = { active: 'Offen', pause: 'Pause', pause1: 'Pause', pause2: 'Pause', closed: 'Kassenschluss' };
  const statusLabel = (status) => STATUS_LABEL[status] || status;
  const isHistoricPause = (status) => status === 'pause1' || status === 'pause2';

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
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3500);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'admin' })
      });
    } catch (err) {
      console.error(err);
    }
    window.location.href = '/';
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

  // DYNAMISCHER TIMEOUT TRIGGER
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
    fetch('/api/periods', { cache: 'no-store' }) // <--- ZWINGT DEN BROWSER ZUR LIVE-ABFRAGE!
      .then(res => res.json())
      .then(data => {
        if (data.success && data.periods) {
          setPeriods(data.periods);
          if (!selectedPeriodId && data.periods.length > 0) {
            // Vorauswahl nach Datum: zuerst der Zeitraum, der heute enthält,
            // sonst der jüngste bereits begonnene, sonst der letzte angelegte.
            const today = new Date().toLocaleDateString('sv-SE');
            const current = data.periods.find(p => p.startDate <= today && today <= p.endDate);
            const latestStarted = data.periods
              .filter(p => p.startDate <= today)
              .sort((a, b) => b.startDate.localeCompare(a.startDate))[0];
            const pick = current || latestStarted || data.periods[data.periods.length - 1];
            setSelectedPeriodId(pick._id);
          }
        }
      })
      .catch(err => console.error(err));

    fetch('/api/products', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => { if (data.products) setProducts(data.products); })
      .catch(err => console.error(err));

    fetch('/api/sales', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => { if (data.success && data.sales) setSalesJournal(data.sales); })
      .catch(err => console.error(err));

    fetch('/api/auth/status', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => setProtection(data))
      .catch(err => console.error(err));

    fetch('/api/settings', { cache: 'no-store' })
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

   fetch(`/api/admin/stats?startDate=${activePeriod.startDate}&endDate=${activePeriod.endDate}`, { cache: 'no-store' }) // <--- ZWINGT ZUM LIVE-ABGLEICH
      .then(res => res.json())
      .then(data => {
        if (data.summary) setStats(data.summary);
        setBestSellers(data.bestSellers || []);
        setSlowSellers(data.slowSellers || []);
        setLowStock(data.lowStock || []);
        setDailyRevenue(data.dailyRevenue || []);
        setVatBreakdown(data.vatBreakdown || []);
      });
  }, [selectedPeriodId, periods]);

  const handlePriceUpdate = async (id, newPrice) => {
    if (!newPrice || isNaN(newPrice)) return;
    const res = await fetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price: parseFloat(newPrice) })
    });
    if (res.ok) {
      loadData();
      triggerToast("Preis erfolgreich im Register aktualisiert!", "success");
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    // Das Formular muss VOR dem ersten await festgehalten werden: React setzt
    // e.currentTarget danach auf null. Früher brach der Code genau hier ab -
    // das Produkt war gespeichert, aber Liste und Bestätigung blieben aus.
    const form = e.currentTarget;
    const formData = new FormData(form);
    const name = formData.get('pname');
    const group = formData.get('pgroup');
    const basePrice = formData.get('pprice');
    const vatRate = formData.get('pvat');

    try {
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
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.product) {
        const grund = res.status === 401
          ? 'Die Anmeldung ist abgelaufen – bitte neu anmelden.'
          : (data.error || `Serverfehler ${res.status}`);
        triggerToast(`„${name}“ wurde nicht angelegt. ${grund}`, 'error');
        return;
      }

      form.reset();
      setProducts(prev => [...prev, data.product].sort((a, b) => a.nr - b.nr));
      setLastAddedProduct(name);
      setTimeout(() => setLastAddedProduct(''), 3500);
      triggerToast(`„${name}“ angelegt – erscheint ab sofort in der Kasse.`, 'success');
    } catch (err) {
      console.error(err);
      triggerToast(`„${name}“ wurde nicht angelegt – keine Verbindung zum Server.`, 'error');
    }
  };

  // Apple Lösch-Modal öffnen
  const openDeleteConfirmation = (product) => {
    setProductToDelete(product);
    setShowDeleteModal(true);
  };

  // Löschung bestätigen & über die API ausführen (Sicheres Soft-Delete)
  const confirmDeleteProduct = async (endgueltig = false) => {
    if (!productToDelete) return;
    const { _id, name } = productToDelete;
    try {
      const res = await fetch(`/api/products/${_id}${endgueltig ? '?endgueltig=1' : ''}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        // 409 = schon verkauft: Dialog offen lassen, damit man direkt
        // "Aus dem Sortiment nehmen" wählen kann.
        const grund = res.status === 401
          ? 'Die Anmeldung ist abgelaufen – bitte neu anmelden.'
          : (data.error || `Serverfehler ${res.status}`);
        triggerToast(`„${name}“: ${grund}`, 'error');
        return;
      }

      setShowDeleteModal(false);
      setProductToDelete(null);
      setProducts(prev => prev.filter(p => p._id !== _id));
      loadData();
      triggerToast(
        endgueltig
          ? `„${name}“ wurde endgültig gelöscht.`
          : `„${name}“ wurde aus dem Sortiment genommen.`,
        'success'
      );
    } catch (err) {
      console.error(err);
      triggerToast('Keine Verbindung zum Server.', 'error');
    }
  };

  // Gleich lautende Produkte (Groß-/Kleinschreibung und Leerzeichen egal)
  // werden markiert, damit versehentliche Dubletten auffallen.
  const nameKey = (name) => String(name || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const nameCounts = products.reduce((acc, p) => {
    const key = nameKey(p.name);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const isDuplicate = (p) => nameCounts[nameKey(p.name)] > 1;

  const handleStartEdit = (product) => {
    setEditingProductId(product._id);
    setEditFields({
      name: product.name,
      group: product.group,
      basePrice: product.basePrice,
      vatRate: product.vatRate,
      stock: product.stock ?? '',
      minStock: product.minStock ?? ''
    });
  };

  const handleCancelEdit = () => {
    setEditingProductId(null);
    setEditFields({});
  };

  const handleSaveEdit = async (id) => {
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editFields.name,
          group: editFields.group,
          price: parseFloat(editFields.basePrice),
          vatRate: parseInt(editFields.vatRate),
          stock: editFields.stock,
          minStock: editFields.minStock
        })
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.product) {
        const grund = res.status === 401
          ? 'Die Anmeldung ist abgelaufen – bitte neu anmelden.'
          : (data.error || `Serverfehler ${res.status}`);
        triggerToast(`Nicht gespeichert. ${grund}`, 'error');
        return;
      }

      // Sofort in der Liste übernehmen, ohne auf das komplette Neuladen zu warten.
      setProducts(prev => prev.map(p => (p._id === id ? data.product : p)));
      setEditingProductId(null);
      setEditFields({});
      loadData();
      triggerToast(`„${data.product.name}“ gespeichert – die Kasse übernimmt es innerhalb von zwei Minuten.`, 'success');
    } catch (err) {
      console.error(err);
      triggerToast('Nicht gespeichert – keine Verbindung zum Server.', 'error');
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bannerActive, bannerMessage, maintenanceActive })
    });
    if (res.ok) {
      loadData();
      triggerToast("Systemkonfiguration erfolgreich aktualisiert!", "success");
    }
  };

  const handleJournalStorno = async (saleId) => {
    if (!confirm("Diesen Beleg wirklich stornieren?")) return;
    const res = await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'STORNO', saleId })
    });
    if (res.ok) {
      loadData();
      triggerToast("Umsatz erfolgreich storniert!", "success");
    }
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
      triggerToast("Abrechnungszeitraum erfolgreich angelegt!", "success");
    }
  };

  const handleDeletePeriod = async (id) => {
    if (!confirm("Möchtest du diesen Abrechnungszeitraum wirklich löschen?")) return;
    const res = await fetch(`/api/periods/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setSelectedPeriodId('');
      loadData();
      triggerToast("Abrechnungszeitraum gelöscht.", "success");
    }
  };

  const activePeriod = periods.find(p => p._id === selectedPeriodId) || null;

  const todayIso = new Date().toLocaleDateString('sv-SE');
  const todayCovered = periods.some(p => p.startDate <= todayIso && todayIso <= p.endDate);

  const getFilteredSales = () => {
    if (!activePeriod) return [];
    return (salesJournal || []).filter(sale => {
      const date = sale.saleDate;
      return date >= activePeriod.startDate && date <= activePeriod.endDate;
    });
  };

  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-[#1D1D1F] dark:text-zinc-100 p-8 font-sans antialiased flex flex-col justify-between selection:bg-[#D31329] selection:text-white transition-colors duration-500">
        
        {/* Haupt-Inhalt */}
        <div>
          <header className="flex justify-between items-center mb-8 border-b pb-6 border-gray-200 dark:border-zinc-800">
            <div className="flex items-center gap-4">
              <Link href="/" className="h-8 w-8 rounded-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-800 flex items-center justify-center text-sm font-bold text-gray-600 dark:text-zinc-300 transition-all active:scale-90">←</Link>
              <div className="flex items-center gap-3">
                <Image src="/logo.png" alt="St. Ursula Villingen" width={40} height={40} priority className="h-10 w-auto object-contain rounded dark:brightness-110" />
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
                    {p.name} ({safeFormatDate(p.startDate)} - {safeFormatDate(p.endDate)})
                  </option>
                ))}
              </select>
            </div>
          </header>

          {protection && !protection.configured && (
            <div className="mb-8 bg-[#D31329]/5 border-2 border-[#D31329]/30 rounded-3xl px-6 py-5 flex items-start gap-4">
              <span className="text-2xl leading-none mt-0.5">🔓</span>
              <div>
                <h3 className="text-base font-extrabold text-[#D31329] tracking-tight">Zugriffsschutz ist nicht aktiv</h3>
                <p className="text-sm text-gray-600 dark:text-zinc-400 mt-1.5 leading-relaxed max-w-3xl">
                  Systemsteuerung und API sind derzeit für jeden erreichbar, der die Adresse kennt.
                  Trage in Vercel unter <span className="font-bold">Project Settings → Environment Variables</span> die
                  Werte <code className="font-mono text-xs bg-white dark:bg-zinc-900 px-1.5 py-0.5 rounded border border-gray-200 dark:border-zinc-800">AUTH_SECRET</code>,
                  {' '}<code className="font-mono text-xs bg-white dark:bg-zinc-900 px-1.5 py-0.5 rounded border border-gray-200 dark:border-zinc-800">ADMIN_PIN</code> und
                  {' '}<code className="font-mono text-xs bg-white dark:bg-zinc-900 px-1.5 py-0.5 rounded border border-gray-200 dark:border-zinc-800">POS_PIN</code> ein
                  und stosse ein neues Deployment an.
                </p>
              </div>
            </div>
          )}

          {protection && protection.configured && (!protection.adminPinSet || !protection.posPinSet) && (
            <div className="mb-8 bg-amber-500/10 border border-amber-500/30 rounded-3xl px-6 py-5 flex items-start gap-4">
              <span className="text-2xl leading-none mt-0.5">⚠️</span>
              <div>
                <h3 className="text-base font-extrabold text-amber-700 tracking-tight">Eine PIN fehlt noch</h3>
                <p className="text-sm text-gray-600 dark:text-zinc-400 mt-1.5 leading-relaxed">
                  {!protection.adminPinSet && 'ADMIN_PIN ist nicht gesetzt – die Systemsteuerung lässt sich nicht entsperren. '}
                  {!protection.posPinSet && 'POS_PIN ist nicht gesetzt – die Kasse lässt sich nicht entsperren.'}
                </p>
              </div>
            </div>
          )}

          {periods.length > 0 && !todayCovered && (
            <div className="mb-8 bg-amber-500/10 border border-amber-500/30 rounded-3xl px-6 py-5 flex items-start gap-4">
              <span className="text-2xl leading-none mt-0.5">📅</span>
              <div>
                <h3 className="text-base font-extrabold text-amber-700 tracking-tight">Für heute ist kein Abrechnungszeitraum angelegt</h3>
                <p className="text-sm text-gray-600 dark:text-zinc-400 mt-1.5 leading-relaxed max-w-3xl">
                  Verkäufe von heute werden gespeichert, erscheinen aber in keinem Zeitraum und damit weder
                  im Journal noch in den Auswertungen. Bitte unten unter „Abrechnungszeiträume verwalten“
                  einen Zeitraum anlegen, der das heutige Datum einschließt.
                </p>
              </div>
            </div>
          )}

          {/* KPI Dashboard */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 dark:bg-zinc-900 rounded-3xl border border-gray-150 dark:border-zinc-800 shadow-sm"><p className="text-xs text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-wider">{KLEINUNTERNEHMER ? 'Umsatz' : 'Umsatz (Brutto)'}</p><p className="text-3xl font-extrabold text-[#D31329] mt-2">{stats.totalRevenue.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</p></div>
            {KLEINUNTERNEHMER ? (
              <div className="bg-white p-6 dark:bg-zinc-900 rounded-3xl border border-gray-150 dark:border-zinc-800 shadow-sm"><p className="text-xs text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-wider">Durchschnittlicher Bon</p><p className="text-3xl font-extrabold text-[#8E8E93] mt-2">{euro(stats.salesCount > 0 ? stats.totalRevenue / stats.salesCount : 0)}</p></div>
            ) : (
              <div className="bg-white p-6 dark:bg-zinc-900 rounded-3xl border border-gray-150 dark:border-zinc-800 shadow-sm"><p className="text-xs text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-wider">Umsatz (Netto)</p><p className="text-3xl font-extrabold text-[#8E8E93] mt-2">{stats.totalNetto?.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }) || '0,00 €'}</p></div>
            )}
            <div className="bg-white p-6 dark:bg-zinc-900 rounded-3xl border border-gray-150 dark:border-zinc-800 shadow-sm"><p className="text-xs text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-wider">Belege gesamt</p><p className="text-3xl font-extrabold mt-2 text-gray-700 dark:text-zinc-200">{stats.salesCount} Belege</p></div>
          </div>

          <div className="grid grid-cols-12 gap-8 mb-8">
            <section className="col-span-6 bg-white p-6 rounded-3xl border border-gray-200/50 dark:border-zinc-800 shadow-sm h-[380px] flex flex-col justify-between">
              <h2 className="text-lg font-bold text-[#D31329] mb-6">Meistverkaufte Artikel</h2>
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
                  <div className="flex items-center justify-between bg-[#F5F5F7] dark:bg-zinc-950 p-3 rounded-xl border dark:border-zinc-800">
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

          {/* AUSWERTUNGEN */}
          <div className="grid grid-cols-12 gap-8 mb-8">

            <section className="col-span-7 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-gray-200/50 dark:border-zinc-800 shadow-sm flex flex-col">
              <div className="flex justify-between items-start gap-4 mb-4">
                <div>
                  <h2 className="text-lg font-bold text-[#D31329]">Tagesabschlüsse</h2>
                  <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1 font-medium">
                    Ein Eintrag je Verkaufstag im gewählten Zeitraum.
                  </p>
                </div>
                <div className="flex flex-col gap-2 items-stretch">
                  <a
                    href={`/api/admin/export?art=tage${activePeriod ? `&startDate=${activePeriod.startDate}&endDate=${activePeriod.endDate}` : ''}`}
                    className="px-5 py-2.5 bg-[#0D2B45] hover:bg-[#163f61] text-white text-center font-bold rounded-xl text-xs uppercase tracking-wider transition-all active:scale-95 whitespace-nowrap"
                  >
                    Tagesabschlüsse (CSV)
                  </a>
                  <a
                    href={`/api/admin/export?art=belege${activePeriod ? `&startDate=${activePeriod.startDate}&endDate=${activePeriod.endDate}` : ''}`}
                    title="Jeder Bon mit allen Positionen, Uhrzeit und Storno-Vermerk"
                    className="px-5 py-2.5 bg-white dark:bg-zinc-900 border border-[#0D2B45]/30 text-[#0D2B45] dark:text-zinc-200 hover:bg-gray-50 text-center font-bold rounded-xl text-xs uppercase tracking-wider transition-all active:scale-95 whitespace-nowrap"
                  >
                    Einzelbelege (CSV)
                  </a>
                </div>
              </div>

              {KLEINUNTERNEHMER ? (
                <p className="text-xs font-bold text-gray-400 dark:text-zinc-500 mb-4 pb-4 border-b dark:border-zinc-800">
                  {KLEINUNTERNEHMER_HINWEIS}
                </p>
              ) : vatBreakdown.length > 0 && (
                <div className="flex flex-wrap gap-x-6 gap-y-1 mb-4 pb-4 border-b dark:border-zinc-800">
                  {vatBreakdown.map(b => (
                    <span key={b.rate} className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
                      MwSt {b.rate} %: <span className="text-gray-700 dark:text-zinc-200 tabular-nums">{euro(b.vat)}</span>
                    </span>
                  ))}
                </div>
              )}

              <div className="overflow-y-auto max-h-72">
                {dailyRevenue.length === 0 ? (
                  <p className="text-sm text-gray-300 dark:text-zinc-600 font-bold text-center py-10">
                    Keine Verkäufe in diesem Zeitraum
                  </p>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-white dark:bg-zinc-900">
                      <tr className="border-b dark:border-zinc-800 text-xs text-gray-400 uppercase tracking-wider font-bold">
                        <th className="py-2">Datum</th>
                        <th className="text-right">Belege</th>
                        {!KLEINUNTERNEHMER && <th className="text-right">Netto</th>}
                        <th className="text-right">{KLEINUNTERNEHMER ? 'Umsatz' : 'Brutto'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyRevenue.map(d => (
                        <tr key={d.date} className="border-b dark:border-zinc-800 text-sm">
                          <td className="py-2.5 font-mono text-xs">{safeFormatDate(d.date)}</td>
                          <td className="text-right tabular-nums text-gray-500">{d.count}</td>
                          {!KLEINUNTERNEHMER && <td className="text-right tabular-nums text-gray-500">{euro(d.netto)}</td>}
                          <td className="text-right font-bold text-[#D31329] tabular-nums">{euro(d.brutto)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>

            <div className="col-span-5 flex flex-col gap-8">
              <section className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-gray-200/50 dark:border-zinc-800 shadow-sm">
                <h2 className="text-lg font-bold text-[#D31329] mb-1">Knappe Bestände</h2>
                <p className="text-xs text-gray-400 dark:text-zinc-500 mb-4 font-medium">
                  Artikel auf oder unter ihrer Mindestmenge.
                </p>
                {lowStock.length === 0 ? (
                  <p className="text-sm text-gray-300 dark:text-zinc-600 font-bold py-4">
                    Nichts knapp – oder noch keine Bestände gepflegt.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
                    {lowStock.map(item => (
                      <div key={item.name} className="flex justify-between items-center gap-3 bg-amber-500/10 border border-amber-500/25 rounded-xl px-3 py-2">
                        <span className="text-sm font-bold text-gray-800 dark:text-zinc-100 truncate">{item.name}</span>
                        <span className="text-xs font-bold text-amber-700 tabular-nums whitespace-nowrap">
                          noch {item.stock} (min. {item.minStock})
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-gray-200/50 dark:border-zinc-800 shadow-sm">
                <h2 className="text-lg font-bold text-[#D31329] mb-1">Ladenhüter</h2>
                <p className="text-xs text-gray-400 dark:text-zinc-500 mb-4 font-medium">
                  Am wenigsten verkauft im gewählten Zeitraum.
                </p>
                {slowSellers.length === 0 ? (
                  <p className="text-sm text-gray-300 dark:text-zinc-600 font-bold py-4">Keine Daten</p>
                ) : (
                  <div className="flex flex-col">
                    {slowSellers.map(item => (
                      <div key={item.name} className="flex justify-between items-center gap-3 py-2 border-b dark:border-zinc-800 last:border-0">
                        <span className="text-sm font-bold text-gray-700 dark:text-zinc-200 truncate">{item.name}</span>
                        <span className={`text-xs font-bold tabular-nums whitespace-nowrap ${item.totalSold === 0 ? 'text-[#D31329]' : 'text-gray-400'}`}>
                          {item.totalSold}× verkauft
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-8 mb-8">
            <section className="col-span-12 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-gray-200/50 dark:border-zinc-800 shadow-sm">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-[#D31329]">Produktverzeichnis</h2>
                  <p className="text-sm text-gray-400 dark:text-zinc-500 mt-1">{products.length} Artikel im Register · Bearbeiten, Hinzufügen, Bestände pflegen</p>
                </div>
                <button
                  onClick={() => setShowProductModal(true)}
                  className="px-6 py-3 bg-[#D31329] hover:bg-[#b01020] text-white font-bold rounded-2xl shadow-md transition-all text-sm uppercase tracking-wider active:scale-95"
                >
                  Verzeichnis öffnen →
                </button>
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
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full uppercase">{statusLabel(sale.status)}</span>
                              {isHistoricPause(sale.status) && (
                                <span className="text-[9px] font-mono text-gray-400" title="Ursprünglicher Wert aus der Zeit der getrennten Pausen">
                                  {sale.status}
                                </span>
                              )}
                            </div>
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

        {/* PRODUKTVERZEICHNIS MODAL */}
        {showProductModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
            <div className="bg-white dark:bg-zinc-950 w-full max-w-5xl max-h-[88vh] rounded-3xl shadow-2xl border border-gray-200 dark:border-zinc-800 flex flex-col">

              {/* Modal Header */}
              <div className="flex justify-between items-center px-8 py-5 border-b dark:border-zinc-800 flex-shrink-0">
                <div>
                  <h2 className="text-xl font-extrabold text-[#D31329] tracking-tight">Produktverzeichnis</h2>
                  <p className="text-xs text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-wider mt-0.5">{products.length} Artikel im Register</p>
                </div>
                <button onClick={() => { setShowProductModal(false); setEditingProductId(null); setEditFields({}); }} className="h-9 w-9 rounded-full bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 flex items-center justify-center text-sm font-bold text-gray-600 dark:text-zinc-300 transition-all active:scale-90">✕</button>
              </div>

              {/* Modal Body */}
              <div className="flex flex-1 overflow-hidden min-h-0">

                {/* Produktliste */}
                <div className="flex-1 overflow-y-auto px-8 py-6">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b dark:border-zinc-800 text-xs text-gray-400 dark:text-zinc-500 uppercase tracking-wider font-bold">
                        <th className="pb-3 w-10">Nr.</th>
                        <th className="pb-3">Bezeichnung</th>
                        <th className="pb-3">Warengruppe</th>
                        <th className="pb-3 text-center w-16">MwSt.</th>
                        <th className="pb-3 text-right w-24">Preis</th>
                        <th className="pb-3 text-center w-28">Bestand</th>
                        <th className="pb-3 text-right w-44">Aktionen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((p) => (
                        <tr key={p._id} className="border-b dark:border-zinc-800 group">
                          <td className="py-2.5 font-mono text-xs text-gray-400">{p.nr}</td>

                          {editingProductId === p._id ? (
                            <>
                              <td className="py-1.5 pr-2">
                                <input
                                  value={editFields.name}
                                  onChange={e => setEditFields(f => ({ ...f, name: e.target.value }))}
                                  className="w-full px-2.5 py-1.5 rounded-lg border dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm font-bold text-gray-800 dark:text-zinc-100 focus:ring-2 focus:ring-[#D31329]/20 focus:border-[#D31329] outline-none"
                                />
                              </td>
                              <td className="py-1.5 pr-2">
                                <select
                                  value={editFields.group}
                                  onChange={e => setEditFields(f => ({ ...f, group: e.target.value }))}
                                  className="w-full px-2.5 py-1.5 rounded-lg border dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-bold text-gray-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-[#D31329]/20 focus:border-[#D31329]"
                                >
                                  <option value="Lebensmittel">Lebensmittel</option>
                                  <option value="Unverpackt; Lebensmittel">Unverpackt; Lebensmittel</option>
                                  <option value="Schreibwaren">Schreibwaren</option>
                                  <option value="Sonstige">Sonstige</option>
                                </select>
                              </td>
                              <td className="py-1.5 pr-2 text-center">
                                <select
                                  value={editFields.vatRate}
                                  onChange={e => setEditFields(f => ({ ...f, vatRate: e.target.value }))}
                                  className="px-2 py-1.5 rounded-lg border dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono text-gray-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-[#D31329]/20"
                                >
                                  <option value={7}>7%</option>
                                  <option value={19}>19%</option>
                                </select>
                              </td>
                              <td className="py-1.5 pr-2 text-right">
                                <input
                                  type="number"
                                  step="0.05"
                                  value={editFields.basePrice}
                                  onChange={e => setEditFields(f => ({ ...f, basePrice: e.target.value }))}
                                  className="w-24 text-right px-2.5 py-1.5 rounded-lg border dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm font-bold text-[#D31329] outline-none focus:ring-2 focus:ring-[#D31329]/20 focus:border-[#D31329]"
                                />
                              </td>
                              <td className="py-1.5 px-2">
                                <div className="flex gap-1 justify-center">
                                  <input
                                    type="number"
                                    min="0"
                                    value={editFields.stock}
                                    onChange={e => setEditFields(f => ({ ...f, stock: e.target.value }))}
                                    placeholder="Best."
                                    title="Restbestand – leer lassen, wenn nicht gepflegt"
                                    className="w-14 text-center px-1.5 py-1.5 rounded-lg border dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-bold text-gray-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-[#D31329]/20"
                                  />
                                  <input
                                    type="number"
                                    min="0"
                                    value={editFields.minStock}
                                    onChange={e => setEditFields(f => ({ ...f, minStock: e.target.value }))}
                                    placeholder="Min."
                                    title="Ab dieser Menge wird gewarnt"
                                    className="w-14 text-center px-1.5 py-1.5 rounded-lg border dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-bold text-gray-500 dark:text-zinc-400 outline-none focus:ring-2 focus:ring-[#D31329]/20"
                                  />
                                </div>
                              </td>
                              <td className="py-1.5 text-right">
                                <div className="flex gap-1.5 justify-end">
                                  <button onClick={() => handleSaveEdit(p._id)} className="px-3 py-1.5 bg-[#D31329] hover:bg-[#b01020] text-white font-bold rounded-lg text-xs transition-all active:scale-95">Speichern</button>
                                  <button onClick={handleCancelEdit} className="px-3 py-1.5 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 text-gray-600 dark:text-zinc-300 font-bold rounded-lg text-xs transition-all">Abbruch</button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="py-2.5 font-bold text-sm text-gray-800 dark:text-zinc-100">
                                {p.name}
                                {isDuplicate(p) && (
                                  <span
                                    title="Es gibt ein weiteres Produkt mit gleichem Namen"
                                    className="ml-2 align-middle text-[10px] font-bold text-amber-700 bg-amber-500/15 px-2 py-0.5 rounded-full uppercase tracking-wide"
                                  >
                                    doppelt?
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5"><span className="text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full uppercase">{p.group}</span></td>
                              <td className="py-2.5 text-center font-mono text-xs text-gray-500">{p.vatRate}%</td>
                              <td className="py-2.5 text-right font-bold text-sm text-[#D31329]">{p.basePrice.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</td>
                              <td className="py-2.5 text-center">
                                {typeof p.stock !== 'number' ? (
                                  <span className="text-xs text-gray-300 dark:text-zinc-700 font-bold" title="Bestand nicht gepflegt">–</span>
                                ) : (
                                  <span
                                    title={typeof p.minStock === 'number' ? `Mindestmenge ${p.minStock}` : 'Keine Mindestmenge hinterlegt'}
                                    className={`text-xs font-bold tabular-nums px-2 py-0.5 rounded-full ${
                                      typeof p.minStock === 'number' && p.stock <= p.minStock
                                        ? 'text-amber-700 bg-amber-500/15'
                                        : 'text-gray-500 dark:text-zinc-400'
                                    }`}
                                  >
                                    {p.stock}{typeof p.minStock === 'number' ? ` / ${p.minStock}` : ''}
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 text-right">
                                <div className="flex gap-1.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => handleStartEdit(p)} className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 text-blue-600 font-bold rounded-lg text-xs uppercase transition-all">Bearbeiten</button>
                                  <button onClick={() => openDeleteConfirmation(p)} className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-lg text-xs uppercase transition-all">Löschen</button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Neues Produkt */}
                <div className="w-72 flex-shrink-0 border-l dark:border-zinc-800 px-6 py-6 flex flex-col overflow-y-auto">
                  <h3 className="text-base font-extrabold text-[#D31329] mb-5">Neues Produkt</h3>
                  <form onSubmit={handleAddProduct} className="flex flex-col gap-4 flex-1">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Bezeichnung</label>
                      <input type="text" name="pname" placeholder="z.B. Bio-Kaffee" className="w-full px-3 py-2.5 rounded-xl border dark:border-zinc-800 bg-white dark:bg-zinc-900 text-gray-800 dark:text-zinc-100 font-medium focus:ring-2 focus:ring-[#D31329]/20 focus:border-[#D31329] outline-none text-sm" required />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Warengruppe</label>
                      <select name="pgroup" className="w-full px-3 py-2.5 rounded-xl border dark:border-zinc-800 bg-white dark:bg-zinc-900 text-gray-800 dark:text-zinc-100 font-medium focus:ring-2 focus:ring-[#D31329]/20 focus:border-[#D31329] outline-none text-sm">
                        <option value="Lebensmittel">Lebensmittel</option>
                        <option value="Unverpackt; Lebensmittel">Unverpackt; Lebensmittel</option>
                        <option value="Schreibwaren">Schreibwaren</option>
                        <option value="Sonstige">Sonstige</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Preis (€)</label>
                      <input type="number" step="0.05" name="pprice" placeholder="0,00" className="w-full px-3 py-2.5 rounded-xl border dark:border-zinc-800 bg-white dark:bg-zinc-900 text-gray-800 dark:text-zinc-100 font-medium focus:ring-2 focus:ring-[#D31329]/20 focus:border-[#D31329] outline-none text-sm" required />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Mehrwertsteuer</label>
                      {KLEINUNTERNEHMER && (
                        <p className="text-[10px] text-gray-400 dark:text-zinc-500 leading-snug mb-1.5">
                          Derzeit ohne Wirkung (§ 19 UStG). Wird nur gebraucht, falls die Regelung einmal wegfällt.
                        </p>
                      )}
                      <select name="pvat" className="w-full px-3 py-2.5 rounded-xl border dark:border-zinc-800 bg-white dark:bg-zinc-900 text-gray-800 dark:text-zinc-100 font-medium focus:ring-2 focus:ring-[#D31329]/20 focus:border-[#D31329] outline-none text-sm">
                        <option value={7}>7% (Lebensmittel)</option>
                        <option value={19}>19% (Zubehör)</option>
                      </select>
                    </div>
                    {lastAddedProduct && (
                      <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                        <span className="text-base">✅</span>
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">„{lastAddedProduct}" hinzugefügt!</span>
                      </div>
                    )}
                    <button type="submit" className="mt-auto w-full py-3 bg-[#D31329] hover:bg-[#b01020] text-white font-bold rounded-xl shadow-md transition-all text-sm active:scale-95">
                      + Produkt hinzufügen
                    </button>
                  </form>
                </div>

              </div>
            </div>
          </div>
        )}

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
                <Image
                  src="/logo.png"
                  alt="Weltladen Logo"
                  width={112}
                  height={112}
                  priority
                  className="h-28 w-28 object-contain rounded-full"
                />
              </div>
            </div>
          </div>
        )}

        {/* ECHTES APPLE LÖSCH-MODAL */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
            <div className="bg-white/95 dark:bg-zinc-950/95 max-w-sm w-full rounded-3xl p-8 shadow-2xl border border-white/20 dark:border-zinc-800/50 relative text-center">
              <span className="text-4xl mb-4 block">📦</span>
              <h3 className="text-lg font-bold text-[#D31329] tracking-tight">Produkt entfernen?</h3>
              <p className="text-sm text-gray-500 dark:text-zinc-400 mt-3 leading-relaxed">
                <span className="font-bold text-gray-800 dark:text-zinc-100">&bdquo;{productToDelete?.name}&ldquo;</span> verschwindet
                in beiden Fällen aus der Kasse und aus diesem Verzeichnis.
              </p>
              <div className="h-px w-full bg-gray-200/50 dark:bg-zinc-800/50 my-6" />
              <div className="flex flex-col gap-3 text-left">
                <button
                  onClick={() => confirmDeleteProduct(false)}
                  className="w-full py-3 bg-[#D31329] hover:bg-[#b01020] text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all active:scale-95"
                >
                  Aus dem Sortiment nehmen
                </button>
                <p className="text-[11px] text-gray-400 dark:text-zinc-500 leading-snug -mt-1 px-1">
                  Der Normalfall. Der Datensatz bleibt erhalten, bisherige Verkäufe bleiben nachvollziehbar.
                </p>
                <button
                  onClick={() => confirmDeleteProduct(true)}
                  className="w-full py-3 bg-white dark:bg-zinc-900 border border-[#D31329]/40 text-[#D31329] hover:bg-red-50 dark:hover:bg-red-950/20 font-bold rounded-xl text-xs uppercase tracking-wider transition-all active:scale-95"
                >
                  Endgültig löschen
                </button>
                <p className="text-[11px] text-gray-400 dark:text-zinc-500 leading-snug -mt-1 px-1">
                  Nur für versehentlich angelegte Dubletten. Geht nur, wenn das Produkt noch nie verkauft
                  wurde, und lässt sich nicht rückgängig machen.
                </p>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="w-full py-3 mt-1 bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 font-bold rounded-xl text-xs uppercase tracking-wider transition-all"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        )}

        {/* GORGEOUS APPLE TOAST NOTIFICATION */}
        {toast.show && (
          <div style={{ zIndex: 9999 }} className={`fixed top-6 left-1/2 transform -translate-x-1/2 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-md border ${
            toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800' : 'bg-red-500/10 border-red-500/20 text-[#D31329]'
          }`}>
            <span className="text-lg">{toast.type === 'success' ? '✅' : '❌'}</span>
            <span className="text-sm font-bold tracking-wide">{toast.message}</span>
          </div>
        )}

        <SiteFooter className="mt-8 bg-white dark:bg-zinc-950 border-t border-gray-150 dark:border-zinc-800" />
      </div>
    </div>
  );
};

export default dynamic(() => Promise.resolve(AdminDashboardComponent), { ssr: false });