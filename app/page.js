// app/page.js
'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Home() {
  const [config, setConfig] = useState({ bannerActive: false, bannerMessage: '', maintenanceActive: false });
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }

    fetch('/api/settings')
      .then(res => res.json())
      .then(data => { if (data.success && data.settings) setConfig(data.settings); })
      .catch(err => console.error(err));
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

  if (config.maintenanceActive) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#09090B] flex flex-col items-center justify-center font-sans antialiased text-[#1D1D1F] dark:text-[#F5F5F7] p-6 transition-colors duration-500 relative overflow-hidden">
        <div className="max-w-md w-full text-center bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl border border-white/20 dark:border-zinc-800/50 p-10 rounded-3xl shadow-xl flex flex-col items-center">
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
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col items-center justify-center font-sans antialiased p-6 transition-colors duration-500 relative overflow-hidden">
        <div className="bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl p-10 rounded-3xl shadow-xl max-w-md w-full text-center border border-white/20 dark:border-zinc-800/50 flex flex-col items-center">
          <img 
            src="/logo.png" 
            alt="St. Ursula" 
            className="h-20 w-auto object-contain mb-6 rounded-lg dark:brightness-110"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <h1 className="text-3xl font-black text-[#D31329] mb-2 tracking-tight">Weltladen St. Ursula</h1>
          <p className="text-gray-400 dark:text-zinc-500 text-xs mb-8 font-bold uppercase tracking-wider">Kassensystem & Administration</p>
          
          <div className="flex flex-col gap-4 w-full">
            <Link 
              href="/pos" 
              className="w-full py-4 bg-[#D31329] hover:bg-[#b01020] text-white font-bold rounded-2xl transition-all duration-300 shadow-[0_4px_20px_rgba(211,19,41,0.2)] text-center hover:scale-[1.02] active:scale-[0.98]"
            >
              Kasse öffnen (Verkauf)
            </Link>
            <Link 
              href="/admin" 
              className="w-full py-4 bg-zinc-200/80 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold rounded-2xl transition-all duration-300 shadow-sm text-center hover:scale-[1.02] active:scale-[0.98]"
            >
              Admin-Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}