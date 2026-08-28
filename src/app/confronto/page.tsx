import type { Metadata } from "next";
import { listSimulations } from "@/actions/simulate";
import { ComparePicker } from "@/components/simulation/compare-picker";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Confronto candidati",
  description: "Confronta fino a 6 simulazioni elettorali.",
};

export default async function ConfrontoPage() {
  const sims = await listSimulations(40);

  return (
    <div className="hero-atmosphere min-h-[calc(100vh-4rem)]">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="mb-2 text-4xl font-semibold tracking-tight text-white">
        Confronto
      </h1>
      <p className="mb-8 text-[var(--muted)]">
        Seleziona da 2 a 6 candidati già simulati — scenari Analista o Amici
      </p>
      <ComparePicker simulations={sims} />
      </div>
    </div>
  );
}
