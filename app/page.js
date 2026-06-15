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

  if (config.maintenanceActive) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center font-sans antialiased text-[#1D1D1F] p-6">
        <div className="max-w-md w-full text-center bg-white/70 backdrop-blur-xl border border-white/20 p-10 rounded-3xl shadow-xl flex flex-col items-center">
          <div className="h-16 w-16 rounded-2xl bg-[#D31329]/10 flex items-center justify-center mb-6 animate-pulse">
            <span className="text-3xl text-[#D31329]">🛠️</span>
          </div>
          <h2 className="text-2xl font-extrabold text-[#D31329] tracking-tight">Systemaktualisierung läuft</h2>
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
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center font-sans antialiased text-[#1D1D1F]">
      <div className="bg-white/80 backdrop-blur-xl p-10 rounded-3xl shadow-xl max-w-md w-full text-center border border-white/20 flex flex-col items-center">
        {/* Logo Integration */}
        <img 
          src="/logo.png" 
          alt="St. Ursula Schulen Villingen" 
          className="h-20 w-auto object-contain mb-6 rounded-lg"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
        <h1 className="text-3xl font-extrabold text-[#D31329] mb-2 tracking-tight">Weltladen St. Ursula</h1>
        <p className="text-gray-400 text-xs mb-8 font-bold uppercase tracking-wider">Kassensystem & Administration</p>
        
        <div className="flex flex-col gap-4 w-full">
          <Link 
            href="/pos" 
            className="w-full py-4 bg-[#D31329] hover:bg-[#b01020] text-white font-bold rounded-2xl transition-all shadow-md text-center hover:scale-[1.02] active:scale-[0.98]"
          >
            Kasse öffnen (Verkauf)
          </Link>
          <Link 
            href="/admin" 
            className="w-full py-4 bg-[#8E8E93] hover:bg-[#737377] text-white font-bold rounded-2xl transition-all shadow-md text-center hover:scale-[1.02] active:scale-[0.98]"
          >
            Admin-Dashboard
          </Link>
        </div>
      </div>
      
      {/* Copyright Footer */}
      <div className="absolute bottom-6 text-center text-[10px] text-gray-400 font-bold uppercase tracking-wider">
        © 2026 Schülerfirma Weltladen St. Ursula Villingen. Alle Rechte vorbehalten für Jill Manuel Hils.
      </div>
    </div>
  );
}