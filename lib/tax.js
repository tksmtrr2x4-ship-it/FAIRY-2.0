// lib/tax.js - [Steuerliche Einstellung der Schülerfirma an einer Stelle]
//
// Die Schülerfirma ist Kleinunternehmer nach § 19 UStG: Es wird keine
// Umsatzsteuer erhoben und keine ausgewiesen. Deshalb blenden Kasse,
// Systemsteuerung und Exporte jede MwSt-Angabe aus.
//
// Die Steuersätze an den Produkten und die in alten Belegen gespeicherten
// Netto-/Steuerbeträge bleiben unverändert erhalten. Fällt die Regelung
// einmal weg (Umsatzgrenze überschritten), genügt es, hier false zu setzen.
export const KLEINUNTERNEHMER = true;

export const KLEINUNTERNEHMER_HINWEIS =
  'Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.';
