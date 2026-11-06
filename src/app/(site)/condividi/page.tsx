import type { Metadata } from "next";
import Link from "next/link";
import { SimulatorApp } from "@/components/simulator/simulator-app";
import { decodeShare } from "@/lib/model/shareLink";

export const metadata: Metadata = {
  title: "Simulazione condivisa",
  description: "Apri uno scenario di Italia Elect salvato in un link, senza account.",
};

export default async function SharePage({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const { s } = await searchParams;
  const payload = s ? decodeShare(s) : null;
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-8 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--it-blue)]">Link</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl sm:text-5xl">Simulazione condivisa</h1>
        <p className="mt-3 text-[var(--muted)]">
          Lo scenario sta nel link, non su un server. Puoi muovere i cursori e crearne un altro.
        </p>
      </header>
      {payload ? (
        <SimulatorApp key={s} initial={payload} />
      ) : (
        <p className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 text-sm">
          Questo link non contiene uno scenario leggibile.{" "}
          <Link className="font-semibold text-[var(--it-blue)] underline" href="/simulatore">
            Apri il simulatore
          </Link>
          .
        </p>
      )}
    </div>
  );
}
