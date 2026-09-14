// app/datenschutz/page.jsx - [Kurze Datenschutzerklärung; Kontaktdaten trägt der Betreiber selbst ein]
import LegalPage, { Section, Platzhalter } from '@/app/components/LegalPage';

export const metadata = {
  title: 'Datenschutz',
  description: 'Datenschutzerklärung zum Kassensystem der Schülerfirma Weltladen St. Ursula Villingen.',
};

export default function DatenschutzPage() {
  return (
    <LegalPage title="Datenschutzerklärung" subtitle="Kassensystem Weltladen St. Ursula">
      <div className="bg-[#F2B600]/10 border border-[#F2B600]/30 rounded-2xl px-5 py-4">
        <p className="text-xs font-bold text-[#8A6200] uppercase tracking-wider mb-1">Noch auszufüllen</p>
        <p className="text-sm text-[#8A6200]/90 leading-relaxed">
          Die gelb hinterlegten Felder sind Platzhalter. Bitte vor der Veröffentlichung durch die
          tatsächlichen Angaben ersetzen und den Text gegenprüfen lassen.
        </p>
      </div>

      <Section heading="Verantwortliche Stelle">
        <p>
          Schülerfirma Weltladen St. Ursula, St. Ursula Schulen Villingen,
          {' '}<Platzhalter>Anschrift</Platzhalter>, E-Mail <Platzhalter>E-Mail-Adresse</Platzhalter>.
        </p>
        <p>
          Datenschutzbeauftragte Person: <Platzhalter>Name und Kontakt, falls benannt</Platzhalter>
        </p>
      </Section>

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

      <Section heading="Speicherung im Browser">
        <p>
          Damit die Kasse auch bei schwachem WLAN zuverlässig arbeitet, legt die Anwendung Daten im
          lokalen Speicher des verwendeten Geräts ab: die Produktliste, noch nicht übertragene
          Verkäufe sowie die gewählte Ansicht. Diese Daten verbleiben auf dem Gerät, werden nicht
          zu Werbezwecken genutzt und lassen sich über die Browsereinstellungen löschen.
          Ein Tracking oder eine Reichweitenmessung findet nicht statt.
        </p>
      </Section>

      <Section heading="Hosting und Datenbank">
        <p>
          Die Anwendung wird bei <Platzhalter>Hosting-Anbieter, derzeit Vercel Inc.</Platzhalter> betrieben,
          die Verkaufsdaten liegen in einer Datenbank bei <Platzhalter>Datenbank-Anbieter, derzeit MongoDB Atlas</Platzhalter>.
          Mit diesen Dienstleistern besteht ein Vertrag zur Auftragsverarbeitung.
          {' '}<Platzhalter>Serverstandort und Vertragsstand bitte prüfen und ergänzen</Platzhalter>
        </p>
      </Section>

      <Section heading="Speicherdauer">
        <p>
          Verkaufsdaten werden für die Dauer der gesetzlichen Aufbewahrungsfristen gespeichert
          (<Platzhalter>Frist prüfen, in der Regel sechs bis zehn Jahre</Platzhalter>).
          Server-Protokolle werden nach kurzer Zeit automatisch gelöscht.
        </p>
      </Section>

      <Section heading="Ihre Rechte">
        <p>
          Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung,
          Datenübertragbarkeit und Widerspruch. Wenden Sie sich dafür an die oben genannte
          verantwortliche Stelle.
        </p>
        <p>
          Außerdem können Sie sich bei einer Datenschutz-Aufsichtsbehörde beschweren, für
          Baden-Württemberg beim Landesbeauftragten für den Datenschutz und die Informationsfreiheit.
        </p>
      </Section>

      <Section heading="Stand">
        <p><Platzhalter>Datum der letzten Aktualisierung</Platzhalter></p>
      </Section>
    </LegalPage>
  );
}
