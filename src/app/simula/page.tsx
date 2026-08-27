import type { Metadata } from "next";
import { SimulationForm } from "@/components/simulation/simulation-form";

export const metadata: Metadata = {
  title: "Nuova simulazione",
  description:
    "Simula un'elezione nazionale italiana inserendo candidato, partito e programma.",
};

export default function SimulaPage() {
  return (
    <div className="hero-atmosphere">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <SimulationForm />
      </div>
    </div>
  );
}
