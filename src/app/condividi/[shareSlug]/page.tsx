import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicSimulation } from "@/actions/simulate";
import { ResultsView } from "@/components/simulation/results-view";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ shareSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { shareSlug } = await params;
  const data = await getPublicSimulation(shareSlug);
  if (!data) return { title: "Link non trovato" };
  return {
    title: `${data.candidate.firstName} ${data.candidate.lastName} (condiviso)`,
    robots: { index: true, follow: true },
  };
}

export default async function SharePage({ params }: Props) {
  const { shareSlug } = await params;
  const data = await getPublicSimulation(shareSlug);
  if (!data) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <p className="mb-6 text-center text-xs uppercase tracking-[0.25em] text-[var(--muted)]">
        Simulazione pubblica
      </p>
      <ResultsView data={data} />
    </div>
  );
}
