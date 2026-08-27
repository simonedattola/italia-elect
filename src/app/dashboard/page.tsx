import type { Metadata } from "next";
import Link from "next/link";
import { listSimulations } from "@/actions/simulate";
import { getParty } from "@/lib/electoral/parties";
import { formatPercent } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Storico delle simulazioni elettorali.",
};

export default async function DashboardPage() {
  const sims = await listSimulations(50);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-4xl text-[var(--it-blue)]">
            Dashboard
          </h1>
          <p className="mt-2 text-[var(--muted)]">
            Storico simulazioni · esportazione e condivisione dai dettagli
          </p>
        </div>
        <Button asChild>
          <Link href="/simula">Nuova simulazione</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Simulazioni recenti</CardTitle>
          <CardDescription>{sims.length} risultati salvati</CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-[var(--border)]">
          {sims.length === 0 && (
            <p className="py-6 text-sm text-[var(--muted)]">
              Nessuna simulazione.{" "}
              <Link href="/simula" className="text-[var(--it-blue)] underline">
                Creane una
              </Link>
              .
            </p>
          )}
          {sims.map((s) => {
            const party = getParty(s.partySlug);
            return (
              <Link
                key={s.id}
                href={`/risultati/${s.slug}`}
                className="flex flex-col gap-1 py-4 transition-colors hover:bg-[var(--surface)] sm:flex-row sm:items-center sm:justify-between sm:px-2"
              >
                <div>
                  <p className="font-medium">{s.candidateName}</p>
                  <p className="text-sm text-[var(--muted)]">
                    {party?.name} ·{" "}
                    {new Date(s.createdAt).toLocaleString("it-IT")}
                  </p>
                </div>
                <div className="text-sm">
                  <span className="font-[family-name:var(--font-display)] text-xl text-[var(--it-blue)]">
                    {formatPercent(s.winProbability, 0)}
                  </span>
                  <span className="ml-2 text-[var(--muted)]">vittoria</span>
                </div>
              </Link>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
