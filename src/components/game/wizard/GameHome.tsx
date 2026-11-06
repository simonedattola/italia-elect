"use client";

import Link from "next/link";

const MODES = [
  { href: "/gioco/locale?mode=ballottaggio", index: "01", title: "Ballottaggio", text: "Due candidati, un comune." },
  { href: "/gioco/locale?mode=regionale", index: "02", title: "Regione", text: "L'ultimo scrutinio regionale aperto." },
  { href: "/gioco/locale?mode=nazionali", index: "03", title: "Coalizioni", text: "Politiche, liste e leader." },
  { href: "/gioco/locale?mode=duello", index: "04", title: "Duello", text: "Tre temi, a tempo, a turno." },
  { href: "/gioco/locale?mode=draft", index: "05", title: "Draft", text: "Una lista e un nome, poi lo spoglio." },
];

export function GameHome() {
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-10">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#7aa7ff]">Partita</p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl leading-none sm:text-6xl">Due giocatori, uno schermo.</h1>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-[var(--muted)]">
        Si passa il telefono. Le scelte dell&apos;altro restano coperte. Lo spoglio usa il simulatore.
      </p>
      <Link href="/gioco/locale" className="mt-8 flex min-h-20 items-center justify-between rounded-2xl bg-[#0166fe] px-5 text-white">
        <span className="font-[family-name:var(--font-display)] text-3xl">Gioca</span>
        <span className="text-sm font-semibold">Apri il tavolo</span>
      </Link>
      <div className="mt-6 grid gap-3">
        {MODES.map((mode) => (
          <Link key={mode.href} href={mode.href} className="mode-card min-h-20 rounded-2xl px-4 py-4">
            <span className="text-xs text-white/40">{mode.index}</span>
            <span className="mt-1 block text-xl font-semibold">{mode.title}</span>
            <span className="text-sm text-[var(--muted)]">{mode.text}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
