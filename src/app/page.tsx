"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ExperienceHub } from "@/components/home/ExperienceHub";
import { VoteIntentPanel } from "@/components/home/VoteIntentPanel";

export default function HomePage() {
  return (
    <div className="relative">
      <div className="hero-atmosphere absolute inset-0 -z-10" />
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="italy-stripe mb-8 h-1 w-24 rounded-full" />

        <header className="max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-widest text-[var(--muted)]">
            Il sistema di simulazione politica totale
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
            <span className="gradient-text-italy">Italia Elect</span>
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-[var(--muted)] sm:text-base">
            Baseline da sondaggi e storico elettorale, 60M elettori virtuali scalati,
            compatibilità multi-dimensionale e sei esperienze di simulazione.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg" className="glow-button-blue">
              <Link href="/simula">Avvia simulazione</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-[var(--border-strong)]">
              <Link href="/metodologia">Metodologia</Link>
            </Button>
          </div>
        </header>

        <section className="mt-14">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
            Esperienze
          </h2>
          <div className="mt-4">
            <ExperienceHub />
          </div>
        </section>

        <section className="mt-14">
          <VoteIntentPanel />
        </section>

        <section className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            { label: "Agenti virtuali", value: "60M", sub: "campione stratificato ISTAT" },
            { label: "Fattori", value: "145", sub: "pesi individuali" },
            { label: "Baseline", value: "Live", sub: "sondaggi + Eligendo" },
          ].map((k) => (
            <div key={k.label} className="glass panel p-5">
              <p className="text-xs text-[var(--muted)]">{k.label}</p>
              <p className="font-mono-data mt-1 text-2xl font-semibold text-white">{k.value}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">{k.sub}</p>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
