// app/impressum/page.jsx - [Impressum nach § 5 DDG; Kontaktdaten trägt der Betreiber selbst ein]
import LegalPage, { Section, Platzhalter } from '@/app/components/LegalPage';

export const metadata = {
  title: 'Impressum',
  description: 'Anbieterkennzeichnung der Schülerfirma Weltladen St. Ursula Villingen.',
};

export default function ImpressumPage() {
  return (
    <LegalPage title="Impressum" subtitle="Angaben gemäß § 5 DDG">
      

      <Section heading="Diensteanbieter">
        <p>Schülerfirma Weltladen St. Ursula</p>
        <p>St. Ursula Schulen Villingen</p>
        <p>Bickenstraße 25</p>
        <p>78050 Villingen-Schwenningen</p>
      </Section>

      <Section heading="Vertreten durch">
        <p>Dr. Christoph Käfer</p>
        <p>Betreuende Lehrkraft der Schülerfirma: Friederike Auer</p>
      </Section>

      <Section heading="Kontakt">
        <p>Telefon: +49 179 4328302</p>
        <p>E-Mail:jill@hils-vs.de</p>
      </Section>

      <Section heading="Verantwortlich für den Inhalt">
        <p>Jill M. Hils</p>
      </Section>

      <Section heading="Rechtsform und Registereintrag">
        <p>
          Die Schülerfirma ist ein pädagogisches Projekt der St. Ursula Schulen Villingen und kein
          eigenständiges Unternehmen. 
        </p>
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
          bitte an die in der Verkäuferansicht hinterlegte Telefonnummer.
        </p>
      </Section>
    </LegalPage>
  );
}
