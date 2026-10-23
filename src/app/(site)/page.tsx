import Link from "next/link";
import { dataCatalog } from "@/data/generated/registry";

const LEVELS = [
  { href: "/simulatore", index: "01", title: "Politiche", text: "Camera e Senato con il Rosatellum vigente. La baseline è la media dei sondaggi pubblicati, non il replay del 2022." },
  { href: "/simulatore", index: "02", title: "Regionali", text: "Lazio e Lombardia 2023, con una legge parametrica dichiarata." },
  { href: "/simulatore", index: "03", title: "Comunali", text: "Il comune presente nell'archivio aperto, con il premio di maggioranza sopra 15.000 abitanti." },
  { href: "/gioco/locale", index: "04", title: "Partita", text: "Due giocatori sullo stesso telefono: ballottaggio, regione, coalizioni, duello o draft." },
] as const;

export default function HomePage() {
  const years = dataCatalog.elections.map((item) => item.year);
  const from = Math.min(...years);
  const to = Math.max(...years);
  return (
    <>
      <section className="hero-atmosphere border-b border-[var(--border)]">
        <div className="italy-stripe h-1.5" />
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--it-blue)]">Archivio e simulazione</p>
          <h1 className="mt-3 max-w-3xl font-[family-name:var(--font-display)] text-5xl leading-none text-[var(--foreground)] sm:text-6xl">
            Le elezioni italiane, dai numeri ufficiali a uno scenario che puoi condividere.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-[var(--muted)]">
            Italia Elect tiene insieme gli scrutini pubblici dal {from} al {to} e un modello Monte Carlo con intervalli.
            I fattori a zero non spostano i voti. Quello che manca in fonte resta vuoto.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/simulatore" className="rounded-lg bg-[var(--it-blue)] px-5 py-2.5 text-sm font-semibold text-white glow-button-blue">
              Apri il simulatore
            </Link>
            <Link href="/archivio" className="rounded-lg border border-[var(--border-strong)] bg-[var(--card)] px-5 py-2.5 text-sm font-semibold">
              Consulta l&apos;archivio
            </Link>
            <Link href="/gioco/locale" className="rounded-lg border border-[var(--border-strong)] bg-[var(--card)] px-5 py-2.5 text-sm font-semibold">
              Gioca in due
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        {LEVELS.map((level) => (
          <Link key={level.title} href={level.href} className="hub-card rounded-2xl p-5">
            <p className="text-xs text-[var(--muted)]">{level.index}</p>
            <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl">{level.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{level.text}</p>
          </Link>
        ))}
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-4 pb-16 sm:px-6 lg:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
          <h2 className="font-[family-name:var(--font-display)] text-3xl">Due modi di usarlo</h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
            Il simulatore parte dagli scrutini ufficiali, assegna i seggi con la legge descritta in metodologia
            e mostra un intervallo 5–95 sulle estrazioni. Puoi inserire una lista ipotetica o candidarti con una lista reale:
            l&apos;affinità viene da un questionario di scenario e sposta i voti solo nella misura dichiarata.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
            La partita sullo stesso telefono usa questo motore: tipo di elezione, liste, leader riconosciuti, scenari
            e spoglio. Le modalità più vecchie in /gioco restano disponibili.
          </p>
          <p className="mt-4 text-sm">
            <Link className="font-semibold text-[var(--it-blue)] underline" href="/metodologia">
              Leggi la metodologia e i buchi di copertura
            </Link>
          </p>
        </article>
        <aside className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">In archivio adesso</h2>
          <p className="mt-3 font-[family-name:var(--font-display)] text-4xl">{dataCatalog.elections.length}</p>
          <p className="text-sm text-[var(--muted)]">scrutini normalizzati, generati il {new Date(dataCatalog.generatedAt).toLocaleDateString("it-IT")}.</p>
          <ul className="mt-4 space-y-2 text-sm">
            {dataCatalog.gaps.slice(0, 4).map((gap) => (
              <li key={gap.level}>
                <span className="font-semibold capitalize">{gap.level}. </span>
                <span className="text-[var(--muted)]">{gap.detail}</span>
              </li>
            ))}
          </ul>
        </aside>
      </section>
    </>
  );
}
