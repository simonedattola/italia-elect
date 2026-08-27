import type { Metadata } from "next";
import { listSimulations } from "@/actions/simulate";
import { ComparePicker } from "@/components/simulation/compare-picker";

export const metadata: Metadata = {
  title: "Confronto candidati",
  description: "Confronta fino a 6 simulazioni elettorali.",
};

export default async function ConfrontoPage() {
  const sims = await listSimulations(40);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="mb-2 font-[family-name:var(--font-display)] text-4xl text-[var(--it-blue)]">
        Confronto
      </h1>
      <p className="mb-8 text-[var(--muted)]">
        Seleziona da 2 a 6 candidati già simulati
      </p>
      <ComparePicker simulations={sims} />
    </div>
  );
}
