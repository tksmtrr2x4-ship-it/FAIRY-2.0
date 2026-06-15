'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Home() {
  const [config, setConfig] = useState({ bannerActive: false, bannerMessage: '', maintenanceActive: false });

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => { if (data.success && data.settings) setConfig(data.settings); })
      .catch(err => console.error(err));
  }, []);

  // GORGEOUS APPLE MAINTENANCE SCREEN
  if (config.maintenanceActive) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center font-sans antialiased text-[#1D1D1F] p-6">
        <div className="max-w-md w-full text-center bg-white/70 backdrop-blur-xl border border-white/20 p-10 rounded-3xl shadow-xl flex flex-col items-center">
          <div className="h-16 w-16 rounded-2xl bg-[#F2B600]/10 flex items-center justify-center mb-6 animate-pulse">
            <span className="text-3xl text-[#F2B600]">🛠️</span>
          </div>
          <h2 className="text-2xl font-extrabold text-[#0B2F5C] tracking-tight">Systemaktualisierung läuft</h2>
          <p className="text-sm text-gray-500 font-medium mt-4 leading-relaxed">
            Der Weltladen St. Ursula führt gerade ein System-Update oder Wartungsarbeiten durch. Wir sind in wenigen Minuten wieder für dich da!
          </p>
          <div className="h-px w-full bg-gray-200/50 my-6" />
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">St. Ursula Schulen Villingen • Schülerfirma</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center font-sans">
      <div className="bg-white/80 backdrop-blur-md p-10 rounded-3xl shadow-xl max-w-md w-full text-center border border-white/20">
        <h1 className="text-3xl font-extrabold text-[#0B2F5C] mb-2 tracking-tight">Weltladen St. Ursula</h1>
        <p className="text-gray-500 text-sm mb-8 font-semibold uppercase tracking-wider">Kassensystem & Administration</p>
        
        <div className="flex flex-col gap-4">
          <Link 
            href="/pos" 
            className="w-full py-4 bg-[#0B2F5C] hover:bg-[#153e63] text-white font-bold rounded-2xl transition-all shadow-md text-center hover:scale-[1.02] active:scale-[0.98]"
          >
            Kasse öffnen (Verkauf)
          </Link>
          <Link 
            href="/admin" 
            className="w-full py-4 bg-[#F2B600] hover:bg-[#d49e1e] text-white font-bold rounded-2xl transition-all shadow-md text-center hover:scale-[1.02] active:scale-[0.98]"
          >
            Admin-Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}