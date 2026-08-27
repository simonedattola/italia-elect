"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createComparison } from "@/actions/compare";
import { getParty } from "@/lib/electoral/parties";
import { formatPercent } from "@/lib/utils";

type SimRow = {
  id: string;
  slug: string;
  candidateName: string;
  partySlug: string;
  winProbability: number;
  confidenceLow: number;
  confidenceHigh: number;
};

export function ComparePicker({ simulations }: { simulations: SimRow[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, start] = useTransition();
  const router = useRouter();

  function toggle(slug: string) {
    setSelected((prev) => {
      if (prev.includes(slug)) return prev.filter((s) => s !== slug);
      if (prev.length >= 6) {
        toast.error("Massimo 6 candidati");
        return prev;
      }
      return [...prev, slug];
    });
  }

  function run() {
    start(async () => {
      const res = await createComparison(selected);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      router.push(`/confronto/${res.slug}`);
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Seleziona fino a 6 simulazioni</CardTitle>
          <CardDescription>
            Confronta probabilità, quote nazionali e province conquistate
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {simulations.length === 0 && (
            <p className="text-sm text-[var(--muted)]">
              Nessuna simulazione ancora. Creane almeno due da /simula.
            </p>
          )}
          {simulations.map((s) => {
            const party = getParty(s.partySlug);
            const on = selected.includes(s.slug);
            return (
              <button
                key={s.slug}
                type="button"
                onClick={() => toggle(s.slug)}
                className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                  on
                    ? "border-[var(--it-blue)] bg-[var(--it-blue)]/5"
                    : "border-[var(--border)] hover:bg-[var(--surface)]"
                }`}
              >
                <span>
                  <span className="font-medium">{s.candidateName}</span>
                  <span className="text-[var(--muted)]"> · {party?.shortName}</span>
                </span>
                <span className="text-[var(--muted)]">
                  {formatPercent(s.winProbability, 0)} vittoria
                </span>
              </button>
            );
          })}
          <Button
            className="mt-4"
            disabled={selected.length < 2 || pending}
            onClick={run}
          >
            Confronta ({selected.length}/6)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
