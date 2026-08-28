import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getComparison } from "@/actions/compare";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DiffVisualizer } from "@/components/simulation/DiffVisualizer";
import { formatPercent } from "@/lib/utils";

export const dynamic = "force-dynamic";

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
  const [a, b] = data.results.candidates;

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
              {"seatsChamber" in c && c.seatsChamber != null ? (
                <p>Seggi Camera: {c.seatsChamber as number}</p>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      {a && b ? (
        <Card>
          <CardHeader>
            <CardTitle>Diff A vs B</CardTitle>
            <CardDescription>Metriche chiave affiancate</CardDescription>
          </CardHeader>
          <CardContent>
            <DiffVisualizer
              a={{
                name: a.name,
                party: a.partyName,
                winProbability: a.winProbability,
                nationalShare: a.nationalShare,
                seatsChamber:
                  "seatsChamber" in a && typeof a.seatsChamber === "number"
                    ? a.seatsChamber
                    : a.provincesWon,
              }}
              b={{
                name: b.name,
                party: b.partyName,
                winProbability: b.winProbability,
                nationalShare: b.nationalShare,
                seatsChamber:
                  "seatsChamber" in b && typeof b.seatsChamber === "number"
                    ? b.seatsChamber
                    : b.provincesWon,
              }}
            />
          </CardContent>
        </Card>
      ) : null}

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
