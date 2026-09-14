// app/components/LegalPage.jsx - [Gemeinsames Gerüst für Impressum und Datenschutzerklärung]
import Link from 'next/link';
import Image from 'next/image';
import SiteFooter from './SiteFooter';

export default function LegalPage({ title, subtitle, children }) {
  return (
    <div className="min-h-screen bg-[#F5F5F7] font-sans antialiased text-[#1D1D1F] flex flex-col">
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/75 border-b border-gray-200/50 px-8 py-4 flex items-center gap-4">
        <Link href="/" className="h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600 transition-all active:scale-90">←</Link>
        <Image src="/logo.png" alt="St. Ursula Villingen" width={40} height={40} priority className="h-10 w-auto object-contain rounded" />
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#D31329]">{title}</h1>
          <p className="text-xs text-gray-400 font-bold tracking-wide uppercase">{subtitle}</p>
        </div>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-6 py-10">
        <div className="bg-white border border-gray-200/50 rounded-3xl shadow-sm p-8 sm:p-10 flex flex-col gap-7">
          {children}
        </div>
      </main>

      <SiteFooter className="bg-white border-t border-gray-200" />
    </div>
  );
}

export function Section({ heading, children }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-base font-bold text-[#D31329] tracking-tight">{heading}</h2>
      <div className="text-sm text-gray-600 leading-relaxed flex flex-col gap-2">{children}</div>
    </section>
  );
}

export function Platzhalter({ children }) {
  return (
    <span className="inline-block bg-[#F2B600]/15 border border-[#F2B600]/40 text-[#8A6200] font-bold rounded px-1.5 py-0.5 text-[13px]">
      {children}
    </span>
  );
}
