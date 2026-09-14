// app/anmelden/page.jsx - [Anmeldung vor Kasse und Systemsteuerung]
import { Suspense } from 'react';
import AnmeldenForm from './AnmeldenForm';

export const metadata = {
  title: 'Anmelden',
  description: 'Zugang zur Kasse und zur Systemsteuerung des Weltladen St. Ursula.',
  robots: { index: false, follow: false },
};

export default function AnmeldenPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F5F5F7]" />}>
      <AnmeldenForm />
    </Suspense>
  );
}
