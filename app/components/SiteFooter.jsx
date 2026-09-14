// app/components/SiteFooter.jsx - [Einheitliche Fußzeile für Start, Kasse und Systemsteuerung]
import Link from 'next/link';

export default function SiteFooter({ className = '' }) {
  return (
    <footer className={`py-5 px-8 flex flex-col items-center gap-1.5 text-center ${className}`}>
      <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-wider">
        © 2026 Schülerfirma Weltladen St. Ursula Villingen
      </p>
      <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-medium tracking-wide">
        Software: Jill Manuel Hils
      </p>
      <nav className="flex items-center gap-3 mt-1">
        <Link href="/impressum" className="text-[10px] text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-wider hover:text-[#D31329] transition-colors">
          Impressum
        </Link>
        <span className="h-2.5 w-px bg-gray-200 dark:bg-zinc-800" />
        <Link href="/datenschutz" className="text-[10px] text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-wider hover:text-[#D31329] transition-colors">
          Datenschutz
        </Link>
      </nav>
    </footer>
  );
}
