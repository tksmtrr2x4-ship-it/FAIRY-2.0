// app/components/Systemzustand.jsx - [Kasten mit Ampeln für Server und Website]
// Grün heißt "in Ordnung", rot heißt "jemand muss sich kümmern", grau heißt
// "noch nicht gemessen oder vom Tarif nicht gemeldet". Nichts davon wird
// geschätzt - jede Zeile zeigt einen wirklich gemessenen Wert.
'use client';
import React, { useState, useEffect, useCallback } from 'react';

// Schwellen bewusst an einer Stelle, damit sie später ohne Suche anpassbar sind.
const SPEICHER_WARNUNG_PROZENT = 80;
const DATENBANK_WARNUNG_MS = 300;
const WEBSITE_WARNUNG_MS = 1000;
const PRUEF_INTERVALL_MS = 60 * 1000;

// Die Datumsangabe kommt als 2026-10-08 aus der Datenbank und soll deutsch lesbar sein.
const tagesdatum = (iso) => {
  const teile = String(iso).split('-');
  return teile.length === 3 ? `${teile[2]}.${teile[1]}.${teile[0]}` : String(iso);
};

const megabyte = (bytes) =>
  `${(bytes / (1024 * 1024)).toLocaleString('de-DE', { maximumFractionDigits: 1 })} MB`;

const Leuchte = ({ zustand }) => {
  const farbe =
    zustand === true
      ? 'bg-emerald-500 ring-emerald-500/20'
      : zustand === false
        ? 'bg-[#D31329] ring-[#D31329]/20'
        : 'bg-gray-300 dark:bg-zinc-700 ring-gray-300/20';
  return <span className={`h-2.5 w-2.5 shrink-0 rounded-full ring-4 ${farbe}`} aria-hidden="true" />;
};

const Systemzustand = ({ maintenanceActive = false }) => {
  const [daten, setDaten] = useState(null);
  const [browserMs, setBrowserMs] = useState(null);
  const [fehler, setFehler] = useState('');
  const [laedt, setLaedt] = useState(true);
  const [geprueftUm, setGeprueftUm] = useState('');

  const pruefen = useCallback(async () => {
    setLaedt(true);
    const start = performance.now();
    try {
      const res = await fetch('/api/admin/health', { cache: 'no-store' });
      setBrowserMs(Math.round(performance.now() - start));

      if (res.status === 401) {
        setFehler('Die Anmeldung ist abgelaufen. Bitte neu in der Systemsteuerung anmelden.');
        setDaten(null);
      } else if (!res.ok) {
        setFehler(`Der Server antwortet mit Fehler ${res.status}.`);
        setDaten(null);
      } else {
        const json = await res.json();
        setDaten(json);
        setFehler('');
      }
    } catch (err) {
      // Hier landet auch der Fall "keine Internetverbindung" - genau deshalb
      // bleibt der Kasten nicht einfach leer, sondern sagt, was los ist.
      setBrowserMs(null);
      setDaten(null);
      setFehler(err?.message ? `Keine Verbindung zum Server (${err.message}).` : 'Keine Verbindung zum Server.');
    } finally {
      setLaedt(false);
      setGeprueftUm(new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }
  }, []);

  useEffect(() => {
    pruefen();
    const timer = setInterval(pruefen, PRUEF_INTERVALL_MS);
    return () => clearInterval(timer);
  }, [pruefen]);

  const db = daten?.datenbank || null;
  const schutz = daten?.schutz || null;
  const schutzOk = schutz ? schutz.eingerichtet && schutz.posPinGesetzt && schutz.adminPinGesetzt : null;

  const zeilen = [
    {
      titel: 'Datenbank-Verbindung',
      zustand: db ? db.verbunden : null,
      wert: db ? (db.verbunden ? `verbunden · ${db.name}` : 'nicht erreichbar') : 'unbekannt',
      hinweis: db?.fehler || null,
    },
    {
      titel: 'Speicherplatz Datenbank',
      zustand: db?.prozent == null ? null : db.prozent < SPEICHER_WARNUNG_PROZENT,
      wert:
        db?.prozent == null
          ? 'nicht gemeldet'
          : `${megabyte(db.belegtBytes)} von ${megabyte(db.limitBytes)} · ${db.prozent.toLocaleString('de-DE', { maximumFractionDigits: 1 })} %`,
      hinweis:
        db?.prozent != null && db.prozent >= SPEICHER_WARNUNG_PROZENT
          ? 'Alte Belege archivieren oder den Atlas-Tarif vergrößern.'
          : null,
    },
    {
      titel: 'Antwortzeit Datenbank',
      zustand: db?.antwortzeitMs == null ? null : db.antwortzeitMs <= DATENBANK_WARNUNG_MS,
      wert: db?.antwortzeitMs == null ? 'keine Messung' : `${db.antwortzeitMs} ms`,
      hinweis:
        db?.antwortzeitMs != null && db.antwortzeitMs > DATENBANK_WARNUNG_MS
          ? 'Die Kasse wird träge. Meist vorübergehend, sonst Atlas-Status prüfen.'
          : null,
    },
    {
      titel: 'Antwortzeit Website',
      zustand: browserMs == null ? null : browserMs <= WEBSITE_WARNUNG_MS,
      wert: browserMs == null ? 'keine Messung' : `${browserMs} ms`,
      hinweis: browserMs != null && browserMs > WEBSITE_WARNUNG_MS ? 'Langsame Internetverbindung im Haus?' : null,
    },
    {
      titel: 'Zugriffsschutz',
      zustand: schutzOk,
      wert:
        schutz == null
          ? 'unbekannt'
          : schutzOk
            ? 'eingerichtet'
            : !schutz.eingerichtet
              ? 'nicht eingerichtet'
              : 'eine PIN fehlt',
      hinweis: schutzOk === false ? 'AUTH_SECRET, ADMIN_PIN und POS_PIN in Vercel hinterlegen.' : null,
    },
    {
      titel: 'Wartungsmodus',
      zustand: !maintenanceActive,
      wert: maintenanceActive ? 'eingeschaltet – Besucher sehen die Wartungsseite' : 'ausgeschaltet',
      hinweis: null,
    },
  ];

  const bekannte = zeilen.filter((z) => z.zustand !== null);
  const anzahlRot = zeilen.filter((z) => z.zustand === false).length;
  // Schlägt die Abfrage fehl, darf oben niemals "Alles in Ordnung" stehen,
  // auch wenn die beiden ohne Server messbaren Zeilen grün aussehen.
  const gesamt = fehler || anzahlRot > 0 ? false : bekannte.length > 0 && bekannte.every((z) => z.zustand === true) ? true : null;

  const sammelText = fehler
    ? 'Prüfung nicht möglich'
    : anzahlRot > 0
      ? `${anzahlRot} ${anzahlRot === 1 ? 'Punkt braucht' : 'Punkte brauchen'} Aufmerksamkeit`
      : gesamt
        ? 'Alles in Ordnung'
        : 'Messung läuft …';

  return (
    <section className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-gray-200/50 dark:border-zinc-800 shadow-sm mb-8">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <Leuchte zustand={gesamt} />
          <div>
            <h2 className="text-lg font-bold text-[#D31329] leading-tight">Systemzustand</h2>
            <p className="text-xs text-gray-400 dark:text-zinc-500 font-semibold mt-0.5">
              {sammelText}
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <button
            onClick={pruefen}
            disabled={laedt}
            className="px-4 py-2 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-200 font-bold rounded-xl text-xs uppercase tracking-wider transition-all disabled:opacity-50"
          >
            {laedt ? 'Prüfe …' : 'Neu prüfen'}
          </button>
          <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-wider mt-1.5">
            Zuletzt geprüft {geprueftUm || '–'}
          </p>
        </div>
      </div>

      {fehler && (
        <div className="mb-4 bg-[#D31329]/5 border border-[#D31329]/30 rounded-2xl px-4 py-3">
          <p className="text-sm font-semibold text-[#D31329]">{fehler}</p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-x-8 gap-y-1">
        {zeilen.map((z) => (
          <div key={z.titel} className="py-2.5 border-b border-gray-100 dark:border-zinc-800 last:border-0">
            <div className="flex items-center gap-2.5">
              <Leuchte zustand={z.zustand} />
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">{z.titel}</span>
            </div>
            <p className="text-sm font-semibold text-gray-800 dark:text-zinc-200 mt-1 ml-[22px] leading-snug">{z.wert}</p>
            {z.hinweis && <p className="text-xs text-[#D31329] mt-1 ml-[22px] leading-snug">{z.hinweis}</p>}
          </div>
        ))}
      </div>

      {daten && (
        <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-4 font-mono">
          {[
            daten.bestand ? `${daten.bestand.belege} Belege` : null,
            daten.bestand ? `${daten.bestand.produkte} Produkte` : null,
            daten.bestand?.letzterBelegAm ? `letzter Beleg ${tagesdatum(daten.bestand.letzterBelegAm)}` : null,
            db?.datensaetze != null ? `${db.datensaetze} Datensätze` : null,
            daten.laufzeit?.region ? `Region ${daten.laufzeit.region}` : null,
            daten.laufzeit?.umgebung ? daten.laufzeit.umgebung : null,
            daten.laufzeit?.nodeVersion ? `Node ${daten.laufzeit.nodeVersion}` : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      )}
    </section>
  );
};

export default Systemzustand;
