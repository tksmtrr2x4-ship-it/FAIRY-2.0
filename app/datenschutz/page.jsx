// app/datenschutz/page.jsx - [Kurze Datenschutzerklärung; Kontaktdaten trägt der Betreiber selbst ein]
import LegalPage, { Section, Platzhalter } from '@/app/components/LegalPage';

export const metadata = {
  title: 'Datenschutz',
  description: 'Datenschutzerklärung zum Kassensystem der Schülerfirma Weltladen St. Ursula Villingen.',
};

export default function DatenschutzPage() {
  return (
    <LegalPage title="Datenschutzerklärung" subtitle="Kassensystem Weltladen St. Ursula">
      

      
      <Section heading="Worum es hier geht">
        <p>
          Dieses Kassensystem dient ausschließlich dem Verkauf im Schul-Weltladen. Beim Einkauf
          werden <strong>keine personenbezogenen Daten von Kundinnen und Kunden erhoben</strong> —
          gespeichert werden nur der verkaufte Artikel, die Menge, der Preis und der Zeitpunkt.
          Namen, Adressen oder Zahlungsdaten werden nicht erfasst.
        </p>
      </Section>

      <Section heading="Welche Daten verarbeitet werden">
        <ul className="list-disc pl-5 flex flex-col gap-1.5">
          <li>
            <strong>Verkaufsdaten:</strong> Artikel, Menge, Preis, Mehrwertsteuersatz, Datum und
            Uhrzeit sowie der Abrechnungsstatus eines Bons. Grundlage ist die Pflicht zur
            ordnungsgemäßen Aufzeichnung von Geschäftsvorfällen.
          </li>
          <li>
            <strong>Produktdaten:</strong> Bezeichnung, Warengruppe, Preis und Bestand der
            angebotenen Artikel.
          </li>
          <li>
            <strong>Server-Protokolle:</strong> Beim Aufruf der Seite überträgt Ihr Browser
            technisch notwendige Angaben wie IP-Adresse, Zeitpunkt und aufgerufene Adresse. Diese
            Protokolle entstehen beim Hosting-Dienstleister und dienen dem sicheren Betrieb.
          </li>
        </ul>
      </Section>

      

      

      

      <Section heading="Stand">
        <p>19.09.2026, 18:17 Uhr</p>
      </Section>
    </LegalPage>
  );
}
