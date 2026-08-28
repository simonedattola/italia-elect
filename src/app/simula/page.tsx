import type { Metadata } from "next";
import { getPartiesForUi } from "@/actions/simulate";
import { SimulationForm } from "@/components/simulation/simulation-form";

export const metadata: Metadata = {
  title: "Simula",
};

export default async function SimulaPage() {
  const parties = await getPartiesForUi();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <SimulationForm parties={parties} />
    </div>
  );
}
