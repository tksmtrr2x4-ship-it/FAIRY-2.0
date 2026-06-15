import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center font-sans">
      <div className="bg-white p-10 rounded-3xl shadow-xl max-w-md w-full text-center border border-gray-100">
        <h1 className="text-3xl font-bold text-[#0D2B45] mb-2 tracking-tight">Weltladen St. Ursula</h1>
        <p className="text-gray-500 text-sm mb-8 font-medium">Kassensystem & Administration</p>
        
        <div className="flex flex-col gap-4">
          <Link 
            href="/pos" 
            className="w-full py-4 bg-[#0D2B45] hover:bg-[#1e486d] text-white font-semibold rounded-2xl transition-all shadow-md text-center hover:scale-[1.02] active:scale-[0.98]"
          >
            Kasse öffnen (Verkauf)
          </Link>
          <Link 
            href="/admin" 
            className="w-full py-4 bg-[#E6AF2E] hover:bg-[#d49e1e] text-white font-semibold rounded-2xl transition-all shadow-md text-center hover:scale-[1.02] active:scale-[0.98]"
          >
            Admin-Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}