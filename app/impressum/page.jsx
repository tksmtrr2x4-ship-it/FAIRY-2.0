// app/impressum/page.jsx - [Impressum nach § 5 DDG; Kontaktdaten trägt der Betreiber selbst ein]
import LegalPage, { Section, Platzhalter } from '@/app/components/LegalPage';

export const metadata = {
  title: 'Impressum',
  description: 'Anbieterkennzeichnung der Schülerfirma Weltladen St. Ursula Villingen.',
};

export default function ImpressumPage() {
  return (
    <LegalPage title="Impressum" subtitle="Angaben gemäß § 5 DDG">
      <div className="bg-[#F2B600]/10 border border-[#F2B600]/30 rounded-2xl px-5 py-4">
        <p className="text-xs font-bold text-[#8A6200] uppercase tracking-wider mb-1">Noch auszufüllen</p>
        <p className="text-sm text-[#8A6200]/90 leading-relaxed">
          Alle gelb hinterlegten Felder sind Platzhalter. Bitte durch die tatsächlichen Angaben
          ersetzen, bevor die Seite öffentlich erreichbar ist.
        </p>
      </div>

      <Section heading="Diensteanbieter">
        <p>Schülerfirma Weltladen St. Ursula</p>
        <p>St. Ursula Schulen Villingen</p>
        <p><Platzhalter>Straße und Hausnummer</Platzhalter></p>
        <p><Platzhalter>PLZ</Platzhalter> Villingen-Schwenningen</p>
      </Section>

      <Section heading="Vertreten durch">
        <p><Platzhalter>Name der Schulleitung bzw. des Trägers</Platzhalter></p>
        <p>Betreuende Lehrkraft der Schülerfirma: <Platzhalter>Name</Platzhalter></p>
      </Section>

      <Section heading="Kontakt">
        <p>Telefon: <Platzhalter>Telefonnummer</Platzhalter></p>
        <p>E-Mail: <Platzhalter>E-Mail-Adresse</Platzhalter></p>
      </Section>

      <Section heading="Verantwortlich für den Inhalt">
        <p><Platzhalter>Name und Anschrift der verantwortlichen Person</Platzhalter></p>
      </Section>

      <Section heading="Rechtsform und Registereintrag">
        <p>
          Die Schülerfirma ist ein pädagogisches Projekt der St. Ursula Schulen Villingen und kein
          eigenständiges Unternehmen. <Platzhalter>Falls abweichend: Rechtsform, Register und Registernummer ergänzen</Platzhalter>
        </p>
      </Section>

      <Section heading="Umsatzsteuer-Identifikationsnummer">
        <p><Platzhalter>USt-IdNr., falls vorhanden – sonst diesen Abschnitt streichen</Platzhalter></p>
      </Section>

      <Section heading="Streitbeilegung">
        <p>
          Wir sind weder verpflichtet noch bereit, an einem Streitbeilegungsverfahren vor einer
          Verbraucherschlichtungsstelle teilzunehmen.
        </p>
      </Section>

      <Section heading="Software">
        <p>
          Das Kassensystem wurde entwickelt von Jill Manuel Hils. Fragen zur Technik richten Sie
          bitte an <Platzhalter>Kontaktadresse für technische Rückfragen</Platzhalter>.
        </p>
      </Section>
    </LegalPage>
  );
}
