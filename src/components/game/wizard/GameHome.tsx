"use client";

import Link from "next/link";
import { MODE_CONFIGS, type ModeSlug } from "@/lib/game/modeConfig";

const MODES: ModeSlug[] = ["multiplayer", "vscomputer", "livelli"];

export function GameHome() {
  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col px-4 py-10 sm:py-16">
      <header className="mb-12 flex flex-col items-center text-center">
        <div
          className="mb-8 flex h-28 w-28 items-center justify-center rounded-2xl border-2 border-dashed border-[var(--border-strong)] bg-[var(--surface)]"
          aria-label="Spazio logo"
        >
          <span className="text-xs uppercase tracking-widest text-[var(--muted)]">Logo</span>
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-5xl font-bold tracking-tight sm:text-6xl">
          Italia Elect
        </h1>
        <p className="mt-3 max-w-md text-sm text-[var(--muted)]">
          Simula elezioni italiane con candidati, partiti e scenari. Scegli la modalità per iniziare.
        </p>
      </header>

      <section>
        <h2 className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
          Modalità
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {MODES.map((slug) => {
            const mode = MODE_CONFIGS[slug];
            return (
              <Link
                key={slug}
                href={`/gioco/${slug}`}
                className="hub-card group flex flex-col rounded-xl p-6 transition-all hover:-translate-y-0.5 hover:border-[var(--border-strong)]"
              >
                <span className="mb-3 text-3xl" aria-hidden>
                  {mode.icon}
                </span>
                <h3 className="text-lg font-semibold">{mode.title}</h3>
                <p className="mt-1 text-xs text-[var(--muted)]">{mode.subtitle}</p>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-[var(--muted)]">
                  {mode.description}
                </p>
                <span className="mt-4 text-sm font-medium text-[var(--it-blue)] group-hover:underline">
                  Gioca →
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
