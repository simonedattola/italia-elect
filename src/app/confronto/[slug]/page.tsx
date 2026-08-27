import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getComparison } from "@/actions/compare";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatPercent } from "@/lib/utils";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getComparison(slug);
  if (!data) return { title: "Confronto" };
  return { title: `Confronto · ${data.results.candidates.length} candidati` };
}

export default async function ConfrontoDetailPage({ params }: Props) {
  const { slug } = await params;
  const data = await getComparison(slug);
  if (!data) notFound();

  const winner = data.results.candidates.find((c) => c.id === data.winnerId);

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-12 sm:px-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-4xl text-[var(--it-blue)]">
          Confronto scenari
        </h1>
        <p className="mt-2 text-[var(--muted)]">
          Vincitore relativo:{" "}
          <strong className="text-[var(--foreground)]">{winner?.name}</strong> (
          {formatPercent(winner?.winProbability ?? 0)} probabilità)
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {data.results.candidates.map((c, i) => (
          <Card
            key={c.id}
            className={i === 0 ? "border-[var(--it-blue)] ring-1 ring-[var(--it-blue)]/30" : ""}
          >
            <CardHeader>
              <CardTitle className="text-lg">
                <Link href={`/risultati/${c.slug}`} className="hover:underline">
                  {c.name}
                </Link>
              </CardTitle>
              <CardDescription>{c.partyName}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                Probabilità vittoria:{" "}
                <strong style={{ color: c.color }}>{formatPercent(c.winProbability)}</strong>
              </p>
              <p>Quota nazionale partito: {formatPercent(c.nationalShare)}</p>
              <p>Province conquistate: {c.provincesWon}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Differenze</CardTitle>
          <CardDescription>
            Province con esito divergente tra scenari: {data.results.contested}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--muted)]">
            {data.analysis}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
