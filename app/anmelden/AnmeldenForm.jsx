'use client';
import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

const ZIFFERN = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

export default function AnmeldenForm() {
  const router = useRouter();
  const params = useSearchParams();

  // Nur interne Pfade zulassen - sonst liesse sich über ?ziel= auf eine
  // fremde Seite weiterleiten.
  const roh = params.get('ziel') || '/pos';
  const ziel = roh.startsWith('/') && !roh.startsWith('//') ? roh : '/pos';
  const role = ziel.startsWith('/admin') ? 'admin' : 'pos';

  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const anmelden = async (eingabe) => {
    if (busy || !eingabe) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, pin: eingabe }),
      });
      const data = await res.json();
      if (data.success) {
        router.replace(ziel);
        router.refresh();
        return;
      }
      setError(data.error || 'Anmeldung fehlgeschlagen.');
      setPin('');
    } catch (err) {
      console.error(err);
      setError('Keine Verbindung zum Server.');
    } finally {
      setBusy(false);
    }
  };

  const tippe = (ziffer) => {
    setError('');
    setPin((prev) => (prev.length >= 12 ? prev : prev + ziffer));
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center font-sans antialiased text-[#1D1D1F] p-6">
      <div className="bg-white border border-gray-200/50 rounded-3xl shadow-xl p-10 w-full max-w-sm flex flex-col items-center">
        <Image
          src="/logo.png"
          alt="St. Ursula Villingen"
          width={64}
          height={64}
          priority
          className="h-16 w-auto object-contain mb-5 rounded-lg"
        />
        <h1 className="text-xl font-extrabold text-[#D31329] tracking-tight text-center">
          {role === 'admin' ? 'Systemsteuerung' : 'Kasse entsperren'}
        </h1>
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1.5 text-center">
          {role === 'admin' ? 'Kennwort erforderlich' : 'PIN des Verkaufsteams'}
        </p>

        {role === 'admin' ? (
          <form
            onSubmit={(e) => { e.preventDefault(); anmelden(pin); }}
            className="w-full mt-7 flex flex-col gap-3"
          >
            <input
              type="password"
              autoFocus
              value={pin}
              onChange={(e) => { setPin(e.target.value); setError(''); }}
              placeholder="Kennwort eingeben…"
              className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 bg-white text-center font-bold tracking-widest text-gray-800 focus:outline-none focus:ring-4 focus:ring-[#D31329]/10 focus:border-[#D31329] transition-all"
            />
            <button
              type="submit"
              disabled={busy || !pin}
              className="w-full py-4 bg-[#D31329] hover:bg-[#b01020] disabled:bg-gray-100 disabled:text-gray-300 text-white font-bold rounded-2xl transition-all shadow-md active:scale-95"
            >
              {busy ? 'Prüfe…' : 'Entsperren'}
            </button>
          </form>
        ) : (
          <div className="w-full mt-7 flex flex-col gap-4">
            <div className="flex justify-center gap-2.5 h-9 items-center" aria-label={`${pin.length} Stellen eingegeben`}>
              {pin.length === 0 ? (
                <span className="text-sm text-gray-300 font-bold">PIN eingeben</span>
              ) : (
                Array.from({ length: pin.length }).map((_, i) => (
                  <span key={i} className="h-3.5 w-3.5 rounded-full bg-[#D31329]" />
                ))
              )}
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {ZIFFERN.map((z) => (
                <button
                  key={z}
                  onClick={() => tippe(z)}
                  className="py-5 bg-[#F5F5F7] hover:bg-gray-200 text-2xl font-bold text-gray-800 rounded-2xl transition-all active:scale-90"
                >
                  {z}
                </button>
              ))}
              <button
                onClick={() => { setPin(''); setError(''); }}
                className="py-5 bg-[#F5F5F7] hover:bg-gray-200 text-xs font-bold uppercase tracking-wider text-gray-500 rounded-2xl transition-all active:scale-90"
              >
                Leeren
              </button>
              <button
                onClick={() => tippe('0')}
                className="py-5 bg-[#F5F5F7] hover:bg-gray-200 text-2xl font-bold text-gray-800 rounded-2xl transition-all active:scale-90"
              >
                0
              </button>
              <button
                onClick={() => { setPin((p) => p.slice(0, -1)); setError(''); }}
                aria-label="Letzte Ziffer löschen"
                className="py-5 bg-[#F5F5F7] hover:bg-gray-200 text-xl font-bold text-gray-500 rounded-2xl transition-all active:scale-90"
              >
                ⌫
              </button>
            </div>

            <button
              onClick={() => anmelden(pin)}
              disabled={busy || !pin}
              className="w-full py-4 bg-[#D31329] hover:bg-[#b01020] disabled:bg-gray-100 disabled:text-gray-300 text-white font-bold rounded-2xl transition-all shadow-md active:scale-95"
            >
              {busy ? 'Prüfe…' : 'Kasse öffnen'}
            </button>
          </div>
        )}

        {error && (
          <p className="mt-5 text-sm font-bold text-[#D31329] bg-[#D31329]/10 px-4 py-3 rounded-xl text-center leading-relaxed">
            {error}
          </p>
        )}

        <Link href="/" className="mt-7 text-[10px] text-gray-400 hover:text-[#D31329] font-bold uppercase tracking-wider transition-colors">
          ← Zurück zur Startseite
        </Link>
      </div>
    </div>
  );
}
