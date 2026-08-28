import type { Metadata } from "next";
import { getDataUpdateLogs } from "@/actions/data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Metodologia e fonti",
  description:
    "Come funziona il simulatore Italia Elect: dati, modelli, limiti e aggiornamenti.",
};

export default async function MetodologiaPage() {
  const logs = await getDataUpdateLogs(10);

  return (
    <div className="hero-atmosphere min-h-[calc(100vh-4rem)]">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-semibold tracking-tight text-white">
        Metodologia
      </h1>
      <p className="mt-3 text-lg text-[var(--muted)]">
        Italia Elect è un <strong className="text-[var(--foreground)]">simulatore statistico</strong>,
        non uno strumento di previsione certa.
      </p>

      <div className="prose-analysis mt-10 space-y-8 text-sm leading-relaxed text-[var(--muted)]">
        <section className="space-y-3">
          <h2>1. Fonti dei dati elettorali</h2>
          <p>
            I risultati storici incorporati derivano da pubblicazioni ufficiali del{" "}
            <strong className="text-[var(--foreground)]">Ministero dell&apos;Interno — Eligendo</strong>{" "}
            e da serie coerenti mappate sul sistema partitico contemporaneo. Ogni elezione in
            database riporta <code>source</code> e <code>sourceUrl</code>.
          </p>
          <p>
            Endpoint di riferimento:{" "}
            <a
              className="text-[var(--it-blue)] underline"
              href="https://elezioni.interno.gov.it/"
              target="_blank"
              rel="noreferrer"
            >
              elezioni.interno.gov.it
            </a>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2>2. Aggiornamento automatico</h2>
          <p>
            Il job <code>refreshElectoralData</code> e il modulo{" "}
            <code>lib/electoral/ingest.ts</code> sono predisposti per verificare nuove
            pubblicazioni, validare i record e registrarli in <code>DataUpdateLog</code>.
            Finché non ci sono dataset nuovi rispetto alla baseline, il log registra un
            controllo senza inserimenti.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            {logs.map((l) => (
              <li key={l.id}>
                {new Date(l.createdAt).toLocaleString("it-IT")} — {l.status}: {l.message}
              </li>
            ))}
            {logs.length === 0 && <li>Nessun log ancora (eseguire il seed).</li>}
          </ul>
        </section>

        <section className="space-y-3">
          <h2>3. Context Intelligence Engine (v2)</h2>
          <p>
            Oltre allo storico, il modello integra: media ponderata dei sondaggi (Poll Aggregator),
            Economic Sentiment Index, Event Impact Analysis, Social Momentum Score (indicatore
            secondario) e pesi dinamici di scenario (crisi economica / politica / stabilità).
          </p>
          <p>
            Il Public Figure Intelligence riconosce figure pubbliche per match esatto (nessuna
            omonimia parziale) e valorizza fortemente il candidato nel Monte Carlo (≥10.000 run).
          </p>
        </section>

        <section className="space-y-3">
          <h2>4. Modello predittivo</h2>
          <p>Per ogni simulazione il motore:</p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Corregge la baseline storica con il Poll Aggregator.</li>
            <li>Applica shock economici, eventi e social (peso secondario).</li>
            <li>Valuta il candidato con impatto non marginale (fuga/attrazione).</li>
            <li>Adatta i pesi al regime di scenario (crisi / stabilità).</li>
            <li>Esegue Monte Carlo (≥10.000 run) con trasferimenti e volatilità.</li>
            <li>Proietta i risultati sulle province e alloca seggi Camera/Senato.</li>
          </ol>
          <p>
            Ogni output include intervallo di confidenza (percentili 10–90) e probabilità di
            vittoria empirica sulle run.
          </p>
        </section>

        <section className="space-y-3">
          <h2>5. Analisi del candidato</h2>
          <p>
            Per figure pubbliche si usano solo informazioni ampiamente note, presentate come{" "}
            <em>inferenze modellistiche</em>, non fatti certi. Per candidati non noti
            l&apos;analisi è limitata a biografia, descrizione e programma. Il sistema segnala
            qualità dati insufficiente quando il testo è troppo scarso.
          </p>
        </section>

        <section className="space-y-3">
          <h2>6. Limiti</h2>
          <p>
            Il modello non sostituisce sondaggi, non replica integralmente la legge elettorale
            vigente e non attribuisce fatti non verificati. L&apos;allocazione dei seggi è una
            semplificazione proporzionale a scopo illustrativo.
          </p>
        </section>
      </div>
      </div>
    </div>
  );
}
