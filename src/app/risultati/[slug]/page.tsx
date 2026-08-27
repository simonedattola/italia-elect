import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSimulationBySlug } from "@/actions/simulate";
import { ResultsView } from "@/components/simulation/results-view";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getSimulationBySlug(slug);
  if (!data) return { title: "Simulazione non trovata" };
  return {
    title: `${data.candidate.firstName} ${data.candidate.lastName}`,
    description: `Simulazione elettorale: ${data.winProbability}% probabilità di vittoria.`,
  };
}

export default async function RisultatiPage({ params }: Props) {
  const { slug } = await params;
  const data = await getSimulationBySlug(slug);
  if (!data) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <ResultsView data={data} />
    </div>
  );
}
