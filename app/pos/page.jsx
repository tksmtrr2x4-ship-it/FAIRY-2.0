// app/pos/page.jsx - [Der exakte, stabile Stand vom 18.06. im St. Ursula Design mit einzeiligem Laufband und Tutorial]
'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import SiteFooter from '../components/SiteFooter';
import ConfirmDialog from '../components/ConfirmDialog';
import { KLEINUNTERNEHMER, KLEINUNTERNEHMER_HINWEIS } from '@/lib/tax';
import {
  readCachedProducts,
  writeCachedProducts,
  createClientId,
  readQueue,
  enqueueSale,
  dequeueSale,
  readProductStats,
  bumpProductStats,
  readSoundPref,
  writeSoundPref,
} from '@/lib/posStorage';

// Splash bleibt stehen, bis die Produkte da sind: mindestens SPLASH_MIN_MS gegen
// Flackern, höchstens SPLASH_MAX_MS, damit eine hängende Verbindung die Kasse nie blockiert.
const SPLASH_MIN_MS = 700;
const SPLASH_MAX_MS = 6000;

// Zwei Tipps auf dieselbe Kachel innerhalb dieser Zeitspanne zählen als einer.
const DOPPELTIPP_MS = 350;

// So oft holt die Kasse im Hintergrund den aktuellen Artikelstand, damit neue
// Produkte und Preisänderungen aus der Systemsteuerung ohne Neustart ankommen.
const PRODUKT_REFRESH_MS = 2 * 60 * 1000;

const euro = (value) =>
  (Number.isFinite(value) ? value : 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });

export default function PosInterface() {
  const [products, setProducts] = useState([]);
  const [productsReady, setProductsReady] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [syncFailed, setSyncFailed] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [givenAmount, setGivenAmount] = useState('');
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [productStats, setProductStats] = useState({});
  const [soundOn, setSoundOn] = useState(true);
  const [lastSale, setLastSale] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [liveTime, setLiveTime] = useState('');
  const [liveDate, setLiveDate] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Apple Toast Notification State
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // System-Konfigurationen
  const [config, setConfig] = useState({ bannerActive: false, bannerMessage: '', maintenanceActive: false });

  // Berichts-States
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportTitle, setReportTitle] = useState('');
  const [pendingPhase, setPendingPhase] = useState('');
  const [reportData, setReportData] = useState({ brutto: 0, netto: 0, vat7: 0, vat19: 0, vatOther: 0, count: 0 });

  // Tutorial & Cinematic Loading States
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [startSplitting, setStartSplitting] = useState(false);
  const splashStartedAt = useRef(Date.now());
  const splashClosing = useRef(false);
  const flushing = useRef(false);
  const lastTap = useRef({});
  const addHistory = useRef([]);
  const audioCtx = useRef(null);

  // Live-Uhrzeit & Datum absolut hydrations-sicher initialisieren
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setLiveTime(now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setLiveDate(now.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Splash öffnet sich, sobald die Produkte stehen - spätestens nach SPLASH_MAX_MS
  useEffect(() => {
    if (!isTransitioning) return;

    const closeSplash = () => {
      if (splashClosing.current) return;
      splashClosing.current = true;
      setStartSplitting(true);
      setTimeout(() => setIsTransitioning(false), 800);
    };

    const elapsed = Date.now() - splashStartedAt.current;
    const delay = productsReady
      ? Math.max(SPLASH_MIN_MS - elapsed, 0)
      : Math.max(SPLASH_MAX_MS - elapsed, 0);

    const timer = setTimeout(closeSplash, delay);
    return () => clearTimeout(timer);
  }, [productsReady, isTransitioning]);

  // Kurzer Ton über die Web-Audio-Schnittstelle - keine Sounddatei nötig, die erst
  // geladen werden müsste. Schlägt etwas fehl, bleibt die Kasse davon unberührt.
  const playBeep = () => {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      if (!audioCtx.current) audioCtx.current = new Ctx();
      const ctx = audioCtx.current;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.13);
    } catch (err) {
      console.warn('Ton konnte nicht abgespielt werden.', err);
    }
  };

  const feedback = () => {
    if (soundOn) playBeep();
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(15);
    }
  };

  // Schichtwechsel: Sitzung beenden und zurück zur PIN-Eingabe.
  const handleLock = async () => {
    if (readQueue().length > 0) {
      triggerToast("Erst die offenen Bons übertragen lassen – dann sperren.", "error");
      return;
    }
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'pos' })
      });
    } catch (err) {
      console.error(err);
    }
    window.location.href = '/anmelden?ziel=%2Fpos';
  };

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    writeSoundPref(next);
    if (next) playBeep();
  };

  const triggerToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  const loadData = () => {
    fetch('/api/products', { cache: 'no-store' }) // <--- ZWINGT DEN BROWSER ZUR LIVE-ABFRAGE!
      .then(res => res.json())
      .then(data => {
        if (!Array.isArray(data.products)) return;
        setProducts(data.products);
        setProductsReady(true);
        setSyncFailed(false);
        setLastSync(writeCachedProducts(data.products));
      })
      .catch(err => {
        console.error(err);
        setSyncFailed(true);
      });

    fetch('/api/settings', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => { if (data.success && data.settings) setConfig(data.settings); })
      .catch(err => console.error(err));
  };

  // Zuerst aus dem lokalen Cache rendern, danach im Hintergrund aktualisieren
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const cached = readCachedProducts();
    if (cached && cached.products.length > 0) {
      setProducts(cached.products);
      setProductsReady(true);
      setLastSync(cached.savedAt);
    }
    loadData();
  }, []);

  // Verkaufshäufigkeit und Ton-Einstellung einmal beim Start übernehmen. Die
  // Sortierung bleibt damit während einer Schicht stabil - die Kacheln springen
  // nicht mitten im Verkauf umher.
  useEffect(() => {
    setProductStats(readProductStats());
    setSoundOn(readSoundPref());
  }, []);

  // Offene Bons aus einer früheren Sitzung sofort weiterschicken
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setPendingCount(readQueue().length);
    flushQueue();
  }, []);

  // Solange Bons offen sind, regelmäßig einen neuen Versuch starten
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (pendingCount === 0) return;
    const timer = setInterval(() => {
      if (navigator.onLine) flushQueue();
    }, 20000);
    return () => clearInterval(timer);
  }, [pendingCount]);

  // Artikelstand regelmäßig und beim Zurückwechseln in die App auffrischen
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const refresh = () => {
      if (navigator.onLine && document.visibilityState === 'visible') loadData();
    };
    const timer = setInterval(refresh, PRODUKT_REFRESH_MS);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  // Verbindungsstatus verfolgen und bei Rückkehr des Netzes nachladen
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); loadData(); flushQueue(); };
    const handleOffline = () => setIsOnline(false);

    setIsOnline(navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const addToCart = (product) => {
    // Doppeltipp abfangen: Ein zweiter Tipp kurz nach dem ersten wird verworfen.
    const now = Date.now();
    if (now - (lastTap.current[product._id] || 0) < DOPPELTIPP_MS) return;
    lastTap.current[product._id] = now;

    feedback();
    addHistory.current.push(product._id);

    setCart(prev => {
      const exists = prev.find(item => item.id === product._id);
      if (exists) {
        return prev.map(item =>
          item.id === product._id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, {
        id: product._id,
        name: product.name,
        priceAtSale: product.basePrice,
        vatRateAtSale: product.vatRate,
        quantity: 1
      }];
    });
  };

  // Nimmt eine Einheit einer Position zurück. Fällt die Menge auf null, verschwindet die Zeile.
  const removeOne = (id) => {
    setCart(prev => prev.flatMap(item => {
      if (item.id !== id) return [item];
      return item.quantity > 1 ? [{ ...item, quantity: item.quantity - 1 }] : [];
    }));
  };

  // Storno der zuletzt erfassten Position - nimmt genau den letzten Tipp zurück.
  const undoLastAdd = () => {
    const id = addHistory.current.pop();
    if (!id) return;
    removeOne(id);
  };

  const resetCart = () => {
    setCart([]);
    setGivenAmount('');
    addHistory.current = [];
    lastTap.current = {};
  };

  // Arbeitet die Warteschlange der Reihe nach ab. Bricht beim ersten Fehlschlag ab,
  // damit die Bons ihre Reihenfolge behalten und nichts verloren geht.
  const flushQueue = async () => {
    if (flushing.current) return;
    flushing.current = true;

    try {
      for (const sale of readQueue()) {
        let data;
        try {
          const res = await fetch('/api/sales', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'CHECKOUT',
              clientId: sale.clientId,
              items: sale.items,
              localDate: sale.localDate
            })
          });
          if (!res.ok) break;
          data = await res.json();
        } catch (err) {
          // Kein Netz: Die Warteschlange bleibt unangetastet stehen.
          break;
        }

        if (!data || !data.success) break;

        const queue = dequeueSale(sale.clientId);
        setPendingCount(queue.length);
        setLastSale(prev =>
          prev && prev.clientId === sale.clientId
            ? { ...prev, serverId: data.sale._id }
            : prev
        );
      }
    } finally {
      flushing.current = false;
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0 || checkoutBusy) return;
    setCheckoutBusy(true);

    const entry = {
      clientId: createClientId(),
      localDate: new Date().toLocaleDateString('sv-SE'),
      createdAt: Date.now(),
      items: cart.map(item => ({
        productId: item.id,
        name: item.name,
        quantity: item.quantity,
        priceAtSale: item.priceAtSale,
        vatRateAtSale: item.vatRateAtSale
      }))
    };

    // Erst lokal sichern, dann senden: Damit ist der Bon auch ohne Netz nicht verloren.
    try {
      const queue = enqueueSale(entry);
      setPendingCount(queue.length);
    } catch (err) {
      triggerToast("Bon konnte nicht gespeichert werden – bitte notieren!", "error");
      setCheckoutBusy(false);
      return;
    }

    bumpProductStats(entry.items);
    setLastSale({ clientId: entry.clientId, serverId: null });
    resetCart();

    await flushQueue();
    setCheckoutBusy(false);

    const stillPending = readQueue().some(sale => sale.clientId === entry.clientId);
    if (stillPending) {
      triggerToast("Bon gespeichert – wird übertragen, sobald wieder Netz da ist.", "pending");
    } else {
      triggerToast("Einkauf erfolgreich gebucht!", "success");
    }
  };

  const handleStorno = async () => {
    if (!lastSale) return;

    // Noch nicht übertragen? Dann genügt es, ihn aus der Warteschlange zu nehmen.
    if (readQueue().some(sale => sale.clientId === lastSale.clientId)) {
      const queue = dequeueSale(lastSale.clientId);
      setPendingCount(queue.length);
      setLastSale(null);
      triggerToast("Letzter Bon verworfen – er war noch nicht übertragen.", "success");
      return;
    }

    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'STORNO',
          saleId: lastSale.serverId,
          clientId: lastSale.clientId
        })
      });
      const data = await res.json();
      if (data.success) {
        triggerToast("Letzter Verkauf storniert!", "success");
        setLastSale(null);
      } else {
        triggerToast("Storno fehlgeschlagen: " + (data.error || "Unbekannt"), "error");
      }
    } catch (err) {
      console.error(err);
      triggerToast("Storno nicht möglich – keine Verbindung zur Datenbank.", "error");
    }
  };

  const prepareReport = async (phase) => {
    // 'pause' fasst die früher getrennten Vorgänge 'pause1' und 'pause2' zusammen.
    // Altbelege behalten ihren ursprünglichen Status unverändert in der Datenbank.
    const titles = { 'pause': 'Abschlussbericht: Pause', 'closed': 'Tagesabschluss (Z-Bon): Kassenschluss' };
    setPendingPhase(phase);
    setReportTitle(titles[phase]);

    const localDateString = new Date().toLocaleDateString('sv-SE');

    // Beim Kassenschluss zählt der ganze Verkaufstag, unabhängig davon, wie oft
    // zwischendurch eine Pause abgeschlossen wurde. Beim Pausenschnitt zählen
    // nur die seither offenen Belege.
    const scope = phase === 'closed' ? '&scope=day' : '';

    try {
      const res = await fetch(`/api/admin/stats?date=${localDateString}${scope}`, { cache: 'no-store' });
      const data = await res.json();

      if (data.success && data.summary) {
        // Echte Aufteilung nach Steuersatz statt der früheren Schätzfaktoren.
        const rateOf = (rate) => (data.vatBreakdown || []).find(b => b.rate === rate)?.vat || 0;
        const known = rateOf(7) + rateOf(19);

        setReportData({
          brutto: data.summary.totalRevenue || 0,
          netto: data.summary.totalNetto || 0,
          vat7: rateOf(7),
          vat19: rateOf(19),
          vatOther: Math.max((data.summary.totalVat || 0) - known, 0),
          count: data.summary.salesCount || 0
        });
      } else {
        setReportData({ brutto: 0, netto: 0, vat7: 0, vat19: 0, vatOther: 0, count: 0 });
      }
      setShowReportModal(true);
    } catch (err) {
      console.error(err);
      triggerToast("Kassenbericht konnte nicht geladen werden – keine Verbindung.", "error");
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
  const cartItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Rückgeld: null, solange nichts eingegeben wurde. Komma wird wie Punkt gelesen.
  const givenValue = parseFloat(String(givenAmount).replace(',', '.'));
  const changeAmount =
    givenAmount !== '' && Number.isFinite(givenValue) ? givenValue - totalCartPrice : null;

  // Häufig verkaufte Artikel nach oben. Die Zählstände werden nur beim Start
  // gelesen, damit die Kacheln während einer Schicht an ihrem Platz bleiben.
  const visibleProducts = products
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    .slice()
    .sort((a, b) => {
      const diff = (productStats[b._id] || 0) - (productStats[a._id] || 0);
      return diff !== 0 ? diff : a.nr - b.nr;
    });

  if (config.maintenanceActive) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center font-sans antialiased text-[#1D1D1F] p-6">
        <div className="max-w-md w-full text-center bg-white border border-gray-200/50 p-10 rounded-3xl shadow-xl flex flex-col items-center">
          <div className="h-16 w-16 rounded-2xl bg-[#D31329]/10 flex items-center justify-center mb-6 animate-pulse">
            <span className="text-3xl text-[#D31329]">🛠️</span>
          </div>
          <h2 className="text-2xl font-extrabold text-[#D31329] tracking-tight">Systemaktualisierung</h2>
          <p className="text-sm text-gray-500 dark:text-zinc-400 font-medium mt-4 leading-relaxed">
            Der Weltladen St. Ursula führt gerade ein System-Update durch. Wir sind in wenigen Minuten wieder einsatzbereit.
          </p>
          <div className="h-px w-full bg-gray-200/50 my-6" />
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">St. Ursula Schulen Villingen • Schülerfirma</p>
        </div>
      </div>
    );
  }

  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-[#1D1D1F] dark:text-zinc-100 font-sans antialiased flex flex-col selection:bg-[#D31329] selection:text-white transition-colors duration-500">
        
        {/* Einzeiliges, lückenloses CSS Marquee */}
        <style>{`
          @keyframes marquee {
            0% { transform: translate3d(0, 0, 0); }
            100% { transform: translate3d(-50%, 0, 0); }
          }
          .animate-marquee-single {
            display: inline-flex;
            white-space: nowrap;
            animation: marquee 25s linear infinite;
          }
          @keyframes pulse-glow {
            0%, 100% { transform: scale(1); filter: drop-shadow(0 0 15px rgba(211,19,41,0.2)); }
            50% { transform: scale(1.03); filter: drop-shadow(0 0 35px rgba(211,19,41,0.6)); }
          }
          .animate-pulse-glow {
            animation: pulse-glow 3s infinite ease-in-out;
          }
        `}</style>

        {/* Header */}
        <header className="sticky top-0 z-40 backdrop-blur-md bg-white/75 border-b border-gray-200/50 px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/" className="h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600 transition-all active:scale-90">←</Link>
            <div className="flex items-center gap-3">
              <Image src="/logo.png" alt="St. Ursula Villingen" width={40} height={40} priority className="h-10 w-auto object-contain rounded" />
              <div>
                <h1 className="text-xl font-bold tracking-tight text-[#D31329]">Weltladen St. Ursula</h1>
                <p className="text-xs text-gray-400 font-bold tracking-wide">FAIRTRADE SCHÜLERFIRMA • VILLINGEN</p>
              </div>
            </div>
            <div className="h-6 w-px bg-gray-200" />
            <div className="flex flex-col gap-0.5">
              <div className={`text-sm font-semibold px-3 py-1 rounded-full flex items-center gap-2 ${
                isOnline
                  ? 'text-[#D31329] bg-[#D31329]/10'
                  : 'text-amber-700 bg-amber-500/15'
              }`}>
                <span className={`h-2 w-2 rounded-full ${isOnline ? 'bg-[#D31329] animate-pulse' : 'bg-amber-500'}`} />
                {isOnline ? 'Live-Kasse' : 'Offline – Verkauf läuft weiter'}
              </div>
              {lastSync && (
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider pl-3">
                  Produktstand {new Date(lastSync).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
                </span>
              )}
            </div>
            {pendingCount > 0 && (
              <div className="text-sm font-semibold text-amber-700 bg-amber-500/15 px-3 py-1 rounded-full flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                {pendingCount} {pendingCount === 1 ? 'Bon' : 'Bons'} noch nicht übertragen
              </div>
            )}
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <span className="text-sm font-bold text-gray-800 font-mono tracking-widest">{liveTime || '00:00:00'}</span>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                {liveDate || 'Lade Datum...'}
              </p>
            </div>
            <div className="h-6 w-px bg-gray-200" />
            <button
              onClick={toggleSound}
              aria-label={soundOn ? 'Signalton ausschalten' : 'Signalton einschalten'}
              title={soundOn ? 'Signalton ausschalten' : 'Signalton einschalten'}
              className="h-9 w-9 rounded-full border border-gray-300 flex items-center justify-center text-sm hover:bg-gray-100 transition-all active:scale-90"
            >
              {soundOn ? '🔊' : '🔇'}
            </button>
            <button
              onClick={() => { setTutorialStep(1); setShowTutorial(true); }}
              className="px-4 py-2 rounded-full border border-gray-300 text-xs font-bold uppercase tracking-wider text-gray-500 hover:bg-[#D31329]/10 hover:text-[#D31329] hover:border-[#D31329]/30 transition-all active:scale-95"
            >
              Hilfe
            </button>
            <button
              onClick={() => setConfirmDialog({
                icon: '🔒',
                title: 'Kasse sperren?',
                message: 'Für den nächsten Verkauf muss die PIN erneut eingegeben werden. Gut für den Schichtwechsel.',
                confirmLabel: 'Sperren',
                onConfirm: () => { setConfirmDialog(null); handleLock(); }
              })}
              className="px-4 py-2 rounded-full border border-gray-300 text-xs font-bold uppercase tracking-wider text-gray-500 hover:bg-gray-100 transition-all active:scale-95"
            >
              Sperren
            </button>
          </div>
        </header>

        {/* Laufband-Banner */}
        {config.bannerActive && (
          <div className="relative w-full overflow-hidden bg-[#D31329]/10 border-b border-[#D31329]/20 text-[#D31329] py-3 text-sm font-bold tracking-wide select-none">
            <div className="flex w-[200%] animate-marquee-single">
              <div className="flex w-1/2 justify-around gap-16 pr-16">
                <span>📢 {config.bannerMessage}</span>
                <span>📢 {config.bannerMessage}</span>
              </div>
              <div className="flex w-1/2 justify-around gap-16 pr-16">
                <span>📢 {config.bannerMessage}</span>
                <span>📢 {config.bannerMessage}</span>
              </div>
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
                className="w-full px-6 py-4 rounded-2xl border border-gray-200 bg-white text-base focus:outline-none focus:ring-4 focus:ring-[#D31329]/10 focus:border-[#D31329] transition-all duration-300 shadow-sm font-medium placeholder-gray-400"
              />
            </div>

            {products.length === 0 ? (
              <div className="flex-1 bg-white border border-gray-100 rounded-3xl p-12 flex flex-col items-center justify-center text-center gap-3">
                {syncFailed ? (
                  <>
                    <span className="text-3xl">📡</span>
                    <h3 className="text-lg font-bold text-[#D31329]">Produktliste nicht erreichbar</h3>
                    <p className="text-sm text-gray-500 font-medium max-w-sm leading-relaxed">
                      Auf diesem Gerät ist noch kein Produktstand gespeichert. Sobald die Verbindung
                      wieder steht, lädt die Kasse die Liste automatisch nach.
                    </p>
                    <button
                      onClick={loadData}
                      className="mt-2 px-6 py-3 bg-[#D31329] hover:bg-[#b01020] text-white font-bold rounded-2xl text-xs uppercase tracking-wider transition-all active:scale-95"
                    >
                      Erneut versuchen
                    </button>
                  </>
                ) : productsReady ? (
                  <>
                    <span className="text-3xl">📦</span>
                    <h3 className="text-lg font-bold text-[#D31329]">Keine Artikel im Register</h3>
                    <p className="text-sm text-gray-500 font-medium max-w-sm leading-relaxed">
                      In der Systemsteuerung sind noch keine Produkte angelegt.
                    </p>
                  </>
                ) : (
                  <h3 className="text-lg font-bold text-[#D31329]">Lade Produkte…</h3>
                )}
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto grid grid-cols-2 xl:grid-cols-3 gap-4 pr-2 max-h-[calc(100vh-280px)]">
                {visibleProducts.map(product => (
                  <button
                    key={product._id}
                    onClick={() => addToCart(product)}
                    className="p-5 bg-white border border-gray-100/80 hover:border-[#D31329] rounded-3xl shadow-sm hover:shadow-xl text-left flex flex-col justify-between h-44 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 group"
                  >
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-[#D31329] tracking-widest uppercase bg-[#D31329]/10 px-2 py-0.5 rounded-full">{product.group}</span>
                      <h3 className="text-base font-bold text-gray-800 line-clamp-2 mt-2.5 leading-snug group-hover:text-[#D31329] transition-colors">{product.name}</h3>
                    </div>
                    <span className="text-2xl font-extrabold text-[#D31329] tabular-nums mt-3">
                      {euro(product.basePrice)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </main>

          <aside className="col-span-4 bg-white border border-gray-200/50 rounded-3xl p-6 flex flex-col shadow-xl backdrop-blur-lg max-h-[calc(100vh-180px)]">
            <div className="flex items-baseline justify-between border-b pb-4 mb-3">
              <h2 className="text-lg font-bold text-[#D31329] tracking-tight">Einkaufszettel</h2>
              {cartItemCount > 0 && (
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  {cartItemCount} {cartItemCount === 1 ? 'Artikel' : 'Artikel'}
                </span>
              )}
            </div>

            {/* Positionen */}
            <div className="flex-1 min-h-0 flex flex-col overflow-y-auto pr-1">
              {cart.length === 0 ? (
                <p className="text-sm text-gray-300 font-bold text-center my-auto">Noch nichts erfasst</p>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 py-2.5 border-b border-gray-50">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-800 truncate">{item.name}</p>
                      <p className="text-xs text-gray-400 font-medium tabular-nums">
                        {item.quantity} × {euro(item.priceAtSale)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-bold text-sm text-[#D31329] tabular-nums">
                        {euro(item.priceAtSale * item.quantity)}
                      </span>
                      <button
                        onClick={() => removeOne(item.id)}
                        aria-label={`Eine Einheit ${item.name} zurücknehmen`}
                        className="h-9 w-9 rounded-full bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-[#D31329] font-bold text-xl leading-none transition-all active:scale-90"
                      >
                        −
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t pt-4 mt-3 shrink-0">
              {/* Summe - deutlich größer als alles andere auf der Seite */}
              <div className="flex justify-between items-baseline mb-4">
                <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">Summe</span>
                <span className="text-5xl font-extrabold text-[#D31329] tabular-nums tracking-tight">
                  {euro(totalCartPrice)}
                </span>
              </div>

              {/* Rückgeld-Rechner */}
              {cart.length > 0 && (
                <div className="bg-[#F5F5F7] rounded-2xl p-4 mb-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <label htmlFor="gegeben" className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Gegeben
                    </label>
                    <div className="relative">
                      <input
                        id="gegeben"
                        type="number"
                        inputMode="decimal"
                        step="0.05"
                        min="0"
                        value={givenAmount}
                        onChange={(e) => setGivenAmount(e.target.value)}
                        placeholder="0,00"
                        className="w-36 text-right pr-9 pl-3 py-2.5 rounded-xl border border-gray-200 bg-white font-bold text-lg text-gray-800 tabular-nums focus:outline-none focus:ring-4 focus:ring-[#D31329]/10 focus:border-[#D31329] transition-all"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold pointer-events-none">€</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {[5, 10, 20].map((value) => (
                      <button
                        key={value}
                        onClick={() => setGivenAmount(String(value))}
                        className="py-2.5 bg-white border border-gray-200 hover:border-[#D31329] hover:text-[#D31329] text-gray-600 font-bold rounded-xl text-sm transition-all active:scale-95"
                      >
                        {value} €
                      </button>
                    ))}
                    <button
                      onClick={() => setGivenAmount(totalCartPrice.toFixed(2))}
                      className="py-2.5 bg-white border border-gray-200 hover:border-[#D31329] hover:text-[#D31329] text-gray-600 font-bold rounded-xl text-xs uppercase tracking-wider transition-all active:scale-95"
                    >
                      Passend
                    </button>
                  </div>

                  <div className="flex justify-between items-baseline border-t border-gray-200 pt-3">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Rückgeld</span>
                    <span className={`text-3xl font-extrabold tabular-nums ${
                      changeAmount !== null && changeAmount >= 0 ? 'text-emerald-600' : 'text-gray-300'
                    }`}>
                      {changeAmount !== null && changeAmount >= 0 ? euro(changeAmount) : '—'}
                    </span>
                  </div>

                  {changeAmount !== null && changeAmount < 0 && (
                    <p className="text-xs font-bold text-amber-700">
                      Es fehlen noch {euro(-changeAmount)}.
                    </p>
                  )}
                </div>
              )}

              <button
                onClick={handleCheckout}
                disabled={cart.length === 0 || checkoutBusy}
                className="w-full py-5 bg-[#D31329] hover:bg-[#b01020] disabled:bg-gray-100 disabled:text-gray-300 text-white text-xl font-extrabold rounded-2xl transition-all duration-300 shadow-md active:scale-95"
              >
                {checkoutBusy ? 'Wird gebucht…' : 'Kauf abschließen'}
              </button>

              {/* Storno vor dem Abschluss */}
              {cart.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button
                    onClick={undoLastAdd}
                    className="py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl text-xs uppercase tracking-wider transition-all active:scale-95"
                  >
                    ↶ Letzte Position
                  </button>
                  <button
                    onClick={() => setConfirmDialog({
                      icon: '🧾',
                      title: 'Ganzen Bon verwerfen?',
                      message: `Alle ${cartItemCount} erfassten Artikel werden vom Einkaufszettel genommen. Gebucht wurde noch nichts.`,
                      confirmLabel: 'Verwerfen',
                      onConfirm: () => { resetCart(); setConfirmDialog(null); triggerToast('Einkaufszettel geleert.', 'success'); }
                    })}
                    className="py-3.5 bg-red-50 hover:bg-red-100 text-[#D31329] font-bold rounded-xl text-xs uppercase tracking-wider transition-all active:scale-95"
                  >
                    Bon verwerfen
                  </button>
                </div>
              )}

              {/* Storno nach dem Abschluss */}
              {lastSale && cart.length === 0 && (
                <button
                  onClick={() => setConfirmDialog({
                    icon: '↩️',
                    title: 'Letzten Verkauf stornieren?',
                    message: 'Der zuletzt abgeschlossene Bon wird als storniert gekennzeichnet und zählt nicht mehr zum Umsatz.',
                    confirmLabel: 'Stornieren',
                    onConfirm: () => { setConfirmDialog(null); handleStorno(); }
                  })}
                  className="w-full mt-2 py-3.5 bg-red-50 hover:bg-red-100 text-[#D31329] font-bold rounded-xl text-xs uppercase tracking-wider transition-all active:scale-95"
                >
                  Letzten Verkauf stornieren
                </button>
              )}
            </div>
          </aside>
        </div>

        {/* Kassenabschlüsse - bewusst weit weg von "Kauf abschließen" und optisch abgesetzt */}
        <footer className="bg-[#F5F5F7] border-t-2 border-gray-200 px-8 py-5 flex flex-wrap justify-between items-center gap-4">
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Kassenabschlüsse</p>
            <p className="text-[11px] text-gray-400 font-medium mt-1 max-w-md leading-relaxed">
              Lässt sich nicht rückgängig machen. Erst am Ende der Pause bzw. des Verkaufstags drücken –
              danach beginnt die Kasse wieder bei 0,00 €.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => prepareReport('pause')}
              className="px-7 py-4 bg-white border border-gray-300 text-gray-700 hover:border-[#0B2F5C] hover:text-[#0B2F5C] font-bold rounded-2xl text-xs uppercase tracking-wider transition-all shadow-sm active:scale-95"
            >
              Pause abschließen
            </button>
            <button
              onClick={() => prepareReport('closed')}
              className="px-7 py-4 bg-white border border-[#D31329]/30 text-[#D31329] hover:bg-[#D31329] hover:text-white font-bold rounded-2xl text-xs uppercase tracking-wider transition-all shadow-sm active:scale-95"
            >
              Kassenschluss
            </button>
          </div>
        </footer>

        {showReportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
            <div className="bg-white/95 max-w-md w-full rounded-3xl p-8 shadow-2xl border border-white/20 relative animate-fade-in">
              <button onClick={() => setShowReportModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-lg font-bold">✕</button>
              <div className="text-center border-b border-dashed border-gray-300 pb-4 mb-6">
                <span className="text-xs font-bold text-[#F2B600] tracking-widest uppercase bg-[#F2B600]/10 px-3 py-1 rounded-full">Kassenbericht</span>
                <h2 className="text-xl font-extrabold text-[#0B2F5C] mt-3">{reportTitle}</h2>
                <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">St. Ursula Villingen</p>
              </div>
              <div className="flex flex-col gap-4 font-mono text-sm text-gray-700">
                <div className="flex justify-between border-b pb-2 text-xs text-gray-400 font-sans font-bold uppercase"><span>Posten</span><span>Summe</span></div>
                <div className="flex justify-between"><span>Bediente Belege:</span><span className="font-bold">{reportData.count} Bons</span></div>
                <div className="flex justify-between"><span>{KLEINUNTERNEHMER ? 'Umsatz:' : 'Umsatz (Brutto):'}</span><span className="font-bold">{euro(reportData.brutto)}</span></div>
                {!KLEINUNTERNEHMER && (
                  <>
                    <div className="flex justify-between text-xs text-gray-400 pl-4"><span>dav. MwSt 7%:</span><span>{euro(reportData.vat7)}</span></div>
                    <div className="flex justify-between text-xs text-gray-400 pl-4"><span>dav. MwSt 19%:</span><span>{euro(reportData.vat19)}</span></div>
                    {reportData.vatOther > 0 && (
                      <div className="flex justify-between text-xs text-gray-400 pl-4"><span>dav. MwSt sonstige:</span><span>{euro(reportData.vatOther)}</span></div>
                    )}
                    <div className="flex justify-between border-t pt-2"><span>Umsatz (Netto):</span><span className="font-bold">{euro(reportData.netto)}</span></div>
                  </>
                )}
                <div className="flex justify-between border-t-2 border-dashed border-gray-300 pt-4 text-base font-bold text-[#0D2B45] font-sans"><span>Soll-Bargeld:</span><span>{euro(reportData.brutto)}</span></div>
                {KLEINUNTERNEHMER && (
                  <p className="text-[10px] text-gray-400 font-sans text-center pt-1">{KLEINUNTERNEHMER_HINWEIS}</p>
                )}
              </div>
              <div className="mt-8 border-t pt-6 flex flex-col gap-3 font-sans">
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <p className="text-xs font-bold text-amber-800 leading-relaxed">
                    Das lässt sich nicht rückgängig machen. Die {reportData.count} Belege werden
                    archiviert und die Kasse beginnt danach wieder bei 0,00 €.
                  </p>
                </div>
                <button onClick={confirmReport} className="w-full py-4 bg-[#0D2B45] hover:bg-[#163f61] text-white font-bold rounded-2xl shadow-md transition-all active:scale-95">
                  {pendingPhase === 'closed' ? 'Kassenschluss endgültig buchen' : 'Pause endgültig abschließen'}
                </button>
                <button onClick={() => window.print()} className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl text-xs uppercase tracking-wider">Bericht drucken</button>
              </div>
            </div>
          </div>
        )}

        {toast.show && (
          <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-md border ${
            toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800'
            : toast.type === 'pending' ? 'bg-amber-500/10 border-amber-500/25 text-amber-800'
            : 'bg-red-500/10 border-red-500/20 text-[#D31329]'
          }`}>
            <span className="text-lg">
              {toast.type === 'success' ? '✅' : toast.type === 'pending' ? '📥' : '❌'}
            </span>
            <span className="text-sm font-bold tracking-wide">{toast.message}</span>
          </div>
        )}

        {confirmDialog && (
          <ConfirmDialog
            {...confirmDialog}
            onCancel={() => setConfirmDialog(null)}
          />
        )}

        {/* TUTORIAL MODAL */}
        {showTutorial && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-md p-4">
            <div className="bg-white/95 max-w-lg w-full rounded-3xl p-8 shadow-2xl border border-white/20 flex flex-col justify-between relative">
              <button onClick={() => setShowTutorial(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-lg font-bold">✕</button>
              
              <div className="text-center border-b border-gray-100 pb-4 mb-6">
                <span className="text-[10px] font-bold text-[#D31329] tracking-widest uppercase bg-[#D31329]/10 px-3 py-1 rounded-full">Benutzerhandbuch</span>
                <h2 className="text-xl font-extrabold text-[#0B2F5C] mt-3">Kassen-Tutorial • Schritt {tutorialStep} von 4</h2>
              </div>

              <div className="py-4 text-[#1D1D1F] leading-relaxed">
                {tutorialStep === 1 && (
                  <div className="flex flex-col items-center text-center">
                    <span className="text-4xl mb-4">🛒</span>
                    <h3 className="font-extrabold text-base text-[#D31329]">Produkte erfassen</h3>
                    <p className="text-sm text-gray-500 mt-2 font-medium">Tippe einfach auf die runden Produktkarten im linken Katalog, um Artikel in deinen Einkaufszettel (Warenkorb) zu legen. Nutze das Suchfeld ganz oben, um Produkte blitzschnell nach Namen zu filtern.</p>
                  </div>
                )}
                {tutorialStep === 2 && (
                  <div className="flex flex-col items-center text-center">
                    <span className="text-4xl mb-4">💳</span>
                    <h3 className="font-extrabold text-base text-[#D31329]">Kauf abschließen</h3>
                    <p className="text-sm text-gray-500 mt-2 font-medium">Überprüfe die Summe im Einkaufszettel rechts und klicke auf <span className="font-bold text-[#D31329]">„Kauf abschließen“</span>. Der Umsatz wird sofort in der MongoDB-Cloud gespeichert. Vertippt? <span className="font-bold text-red-500">„↶ Letzte Position“</span> nimmt den letzten Tipp zurück, <span className="font-bold text-red-500">„Bon verwerfen“</span> leert den ganzen Einkaufszettel. Ist der Kauf schon gebucht, hilft <span className="font-bold text-red-500">„Letzten Verkauf stornieren“</span>.</p>
                  </div>
                )}
                {tutorialStep === 3 && (
                  <div className="flex flex-col items-center text-center">
                    <span className="text-4xl mb-4">📊</span>
                    <h3 className="font-extrabold text-base text-[#D31329]">Pause und Kassenschluss</h3>
                    <p className="text-sm text-gray-500 mt-2 font-medium">Am Ende einer Pause drückt das Team unten auf <span className="font-bold text-[#D31329]">„Pause abschließen“</span>, am Ende des Verkaufstags auf <span className="font-bold text-[#D31329]">„Kassenschluss“</span>. Es öffnet sich ein Z-Bon mit allen Summen. Diese Knöpfe stehen bewusst unten und weit weg vom Kauf-Knopf, weil sie sich <span className="font-bold">nicht zurücknehmen</span> lassen.</p>
                  </div>
                )}
                {tutorialStep === 4 && (
                  <div className="flex flex-col items-center text-center">
                    <span className="text-4xl mb-4">🔒</span>
                    <h3 className="font-extrabold text-base text-[#D31329]">Schichtwechsel & Schutz</h3>
                    <p className="text-sm text-gray-500 mt-2 font-medium">Beim Schichtwechsel drückst du oben rechts auf <span className="font-bold text-[#D31329]">„Sperren“</span> – danach fragt die Kasse wieder nach der PIN. Über den Pfeil <span className="font-bold">「←」</span> oben links geht es zurück zum Startmenü. Die Systemsteuerung hat ein eigenes Kennwort, damit niemand unbefugt Preise ändern kann.</p>
                  </div>
                )}
              </div>

              <div className="mt-8 border-t pt-6 flex justify-between items-center">
                <button disabled={tutorialStep === 1} onClick={() => setTutorialStep(prev => prev - 1)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 font-bold rounded-xl text-xs uppercase tracking-wider transition-all">Zurück</button>
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

        {/* COOLE KINO-SPALT-ÖFFNUNGS-ANIMATION (Wird beim Laden eingeblendet) */}
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
              <div className="p-4 bg-white rounded-full shadow-[0_0_50px_rgba(211,19,41,0.25)] animate-pulse-glow">
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

        <SiteFooter className="mt-auto bg-white border-t border-gray-150" />
      </div>
    </div>
  );
}