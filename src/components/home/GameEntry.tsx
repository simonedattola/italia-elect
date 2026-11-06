"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

const MODES = [
  {
    href: "/gioco/locale?mode=ballottaggio",
    index: "01",
    title: "Ballottaggio",
    text: "Due nomi, un comune. Resta chi è davanti.",
    motif: "bars",
  },
  {
    href: "/gioco/locale?mode=regionale",
    index: "02",
    title: "Regione",
    text: "L'ultimo scrutinio regionale aperto, non una mappa disegnata.",
    motif: "map",
  },
  {
    href: "/gioco/locale?mode=nazionali",
    index: "03",
    title: "Coalizioni",
    text: "Politiche, liste e il Rosatellum. Con l'intervallo.",
    motif: "hemicycle",
  },
  {
    href: "/gioco/locale?mode=duello",
    index: "04",
    title: "Duello",
    text: "Tre temi, a tempo. Il telefono passa e copre la risposta.",
    motif: "timer",
  },
  {
    href: "/gioco/locale?mode=draft",
    index: "05",
    title: "Draft",
    text: "Una lista, un nome, poi lo spoglio.",
    motif: "cards",
  },
] as const;

export function GameEntry({ scrutini }: { scrutini: number }) {
  const reduce = useReducedMotion();
  return (
    <div className="home-entry">
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(1,102,254,0.42),transparent_52%)]" />
        <div className="mx-auto flex min-h-[calc(100dvh-9rem)] w-full max-w-6xl flex-col justify-end px-4 pb-8 pt-6 sm:min-h-[calc(100dvh-5rem)] sm:px-6 sm:pb-16 sm:pt-10">
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs font-semibold uppercase tracking-[0.28em] text-[#7aa7ff]"
          >
            00 — Italia Elect
          </motion.p>
          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mt-4 max-w-5xl font-[family-name:var(--font-display)] text-[3.6rem] leading-[0.86] text-white sm:text-8xl"
          >
            Scegli
            <span className="block">la partita.</span>
          </motion.h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-white/70 sm:text-lg">
            Due sullo stesso telefono, oppure uno scenario da leggere. Poi arriva lo spoglio.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <Link
              href="/gioco/locale"
              className="flex min-h-24 items-end justify-between rounded-2xl bg-[#0166fe] px-5 py-5 text-white shadow-[0_16px_40px_rgba(1,102,254,0.35)] active:scale-[0.98]"
            >
              <span>
                <span className="block text-xs uppercase tracking-[0.18em] text-white/70">Gioca</span>
                <span className="mt-1 block font-[family-name:var(--font-display)] text-4xl leading-none sm:text-5xl">Entra</span>
              </span>
              <span className="text-sm font-semibold">Passa il telefono</span>
            </Link>
            <Link
              href="/simulatore"
              className="flex min-h-24 items-end justify-between rounded-2xl border border-white/15 bg-white/5 px-5 py-5 text-white active:scale-[0.98]"
            >
              <span>
                <span className="block text-xs uppercase tracking-[0.18em] text-white/50">Simula</span>
                <span className="mt-1 block font-[family-name:var(--font-display)] text-4xl leading-none sm:text-5xl">Apri</span>
              </span>
              <span className="text-sm font-semibold text-white/80">Politiche, regioni, comuni</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-[family-name:var(--font-display)] text-4xl text-white">Modalità</h2>
          <p className="text-xs uppercase tracking-[0.16em] text-white/40">{scrutini} scrutini</p>
        </div>
        <div className="mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3 lg:grid lg:grid-cols-5 lg:overflow-visible">
          {MODES.map((mode, index) => (
            <motion.div
              key={mode.href}
              className="w-[78%] shrink-0 snap-start sm:w-[46%] lg:w-auto"
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 * index }}
            >
              <Link href={mode.href} className="mode-card flex h-full min-h-64 flex-col rounded-2xl p-4 active:scale-[0.98]">
                <Motif kind={mode.motif} reduce={Boolean(reduce)} />
                <p className="mt-auto pt-6 text-xs text-white/40">{mode.index}</p>
                <h3 className="mt-1 font-[family-name:var(--font-display)] text-3xl text-white">{mode.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/60">{mode.text}</p>
              </Link>
            </motion.div>
          ))}
        </div>
        <p className="mt-8 text-sm text-white/50">
          <Link className="font-semibold text-[#7aa7ff] underline" href="/archivio">
            Archivio
          </Link>
          {" · "}
          <Link className="font-semibold text-[#7aa7ff] underline" href="/metodologia">
            Metodologia e backtest
          </Link>
        </p>
      </section>
    </div>
  );
}

function Motif({ kind, reduce }: { kind: string; reduce: boolean }) {
  if (kind === "bars") {
    const heights = [42, 78, 56, 92];
    return (
      <div className="flex h-20 items-end gap-1.5" aria-hidden>
        {heights.map((height, index) => (
          <motion.span
            key={height}
            className="w-3.5 rounded-sm bg-[#0166fe]"
            initial={reduce ? { height: `${height}%` } : { height: "12%" }}
            animate={{ height: `${height}%` }}
            transition={{ delay: 0.15 + index * 0.08, duration: 0.6, ease: "easeOut" }}
          />
        ))}
      </div>
    );
  }
  if (kind === "map") {
    return (
      <div className="grid h-20 w-20 grid-cols-3 gap-1" aria-hidden>
        {Array.from({ length: 9 }, (_, index) => (
          <motion.span
            key={index}
            className={`rounded-sm ${index % 2 === 0 ? "bg-[#0166fe]" : "bg-white/15"}`}
            initial={reduce ? false : { opacity: 0.2 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * 0.04 }}
          />
        ))}
      </div>
    );
  }
  if (kind === "timer") {
    return (
      <div className="grid h-20 w-20 place-items-center rounded-full border-2 border-[#0166fe]" aria-hidden>
        <span className="font-[family-name:var(--font-display)] text-2xl text-white">20</span>
      </div>
    );
  }
  if (kind === "cards") {
    return (
      <div className="relative h-20 w-24" aria-hidden>
        <span className="absolute left-0 top-3 h-14 w-14 rounded-lg border border-white/20 bg-white/10" />
        <motion.span
          className="absolute left-5 top-0 h-14 w-14 rounded-lg border border-[#0166fe] bg-[#0166fe]/40"
          initial={reduce ? false : { x: -8, opacity: 0.4 }}
          animate={{ x: 0, opacity: 1 }}
        />
      </div>
    );
  }
  return (
    <div className="flex h-20 items-end gap-1" aria-hidden>
      {Array.from({ length: 16 }, (_, index) => (
        <motion.span
          key={index}
          className="w-1.5 rounded-full bg-[#0166fe]"
          initial={reduce ? { height: 18 + ((index * 17) % 48) } : { height: 8 }}
          animate={{ height: 18 + ((index * 17) % 48) }}
          transition={{ delay: index * 0.03 }}
        />
      ))}
    </div>
  );
}
