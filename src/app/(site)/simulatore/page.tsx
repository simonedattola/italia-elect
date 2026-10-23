import type { Metadata } from "next";
import { SimulatorApp } from "@/components/simulator/simulator-app";

export const metadata: Metadata = {
  title: "Simulatore",
  description:
    "Simula elezioni politiche, europee, regionali e comunali italiane con Monte Carlo, seggi e intervalli di confidenza.",
};

export default function SimulatorPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-8 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--it-blue)]">Scenario</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl sm:text-5xl">Simulatore</h1>
        <p className="mt-3 text-[var(--muted)]">
          La baseline è uno scrutinio ufficiale. Il rumore Monte Carlo è riproducibile dal seme.
          I sondaggi dimostrativi restano spenti finché non li attivi.
        </p>
      </header>
      <SimulatorApp />
    </div>
  );
}
