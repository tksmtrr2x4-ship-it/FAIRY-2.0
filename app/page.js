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

  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col items-center justify-center font-sans antialiased p-6 transition-colors duration-500 relative overflow-hidden">
        
        {/* Glow-Animationen */}
        <style>{`
          @keyframes rotate-blob {
            0%, 100% { transform: translate(0, 0) scale(1) rotate(0deg); }
            33% { transform: translate(30px, -50px) scale(1.1) rotate(120deg); }
            66% { transform: translate(-20px, 20px) scale(0.9) rotate(240deg); }
          }
          .animate-blob-slow { animation: rotate-blob 25s infinite alternate ease-in-out; }
          .animate-blob-reverse { animation: rotate-blob 30s infinite alternate-reverse ease-in-out; }
        `}</style>

        {/* Dynamic SaaS Blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-[#D31329]/8 dark:bg-[#D31329]/5 rounded-full blur-[120px] animate-blob-slow pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-zinc-400/20 dark:bg-zinc-800/10 rounded-full blur-[120px] animate-blob-reverse pointer-events-none" />

        {/* Theme Toggle Button */}
        <button 
          onClick={toggleTheme}
          className="absolute top-6 right-6 p-3 bg-white/70 dark:bg-zinc-900/70 border border-gray-200/50 dark:border-zinc-800/50 rounded-full shadow-sm hover:shadow-lg transition-all duration-300 z-50 active:scale-95 text-lg"
          title="Farbmodus wechseln"
        >
          {isDarkMode ? '☀️' : '🌙'}
        </button>

        {/* Bento Hub Box */}
        <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-2xl p-10 rounded-3xl shadow-[0_12px_40px_rgba(0,0,0,0.03)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.4)] max-w-md w-full text-center border border-white/20 dark:border-zinc-800/50 flex flex-col items-center z-10 transform hover:scale-[1.01] transition-all duration-500 hover:shadow-2xl">
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
        
        {/* Copyright Footer */}
        <div className="absolute bottom-6 text-center text-[10px] text-gray-400 dark:text-zinc-600 font-bold uppercase tracking-wider z-10">
          © 2026 Schülerfirma Weltladen St. Ursula Villingen. Alle Rechte vorbehalten für Jill Manuel Hils.
        </div>
      </div>
    </div>
  );
}