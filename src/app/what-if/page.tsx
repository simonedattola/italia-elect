"use client";

import { useState } from "react";
import { PageHeader, PageShell } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { PARTIES } from "@/lib/electoral/parties";

export default function WhatIfPage() {
  const [hypothesis, setHypothesis] = useState("");
  const [result, setResult] = useState<{
    interpretation: { summary: string; narrative: string; confidence: number };
    before: Record<string, number>;
    after: Record<string, number>;
    deltas: Record<string, number>;
  } | null>(null);
  const [pending, setPending] = useState(false);

  async function analyze() {
    setPending(true);
    try {
      const res = await fetch("/api/what-if", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hypothesis }),
      });
      const data = await res.json();
      if (data.ok) setResult(data);
    } finally {
      setPending(false);
    }
  }

  return (
    <PageShell narrow>
      <PageHeader title="What-if" />

      <div className="panel rounded-lg p-5">
        <Textarea
          value={hypothesis}
          onChange={(e) => setHypothesis(e.target.value)}
          className="min-h-[100px]"
        />
        <Button
          onClick={analyze}
          disabled={pending || !hypothesis.trim()}
          className="mt-4 w-full sm:w-auto"
        >
          {pending ? "…" : "Analizza"}
        </Button>
      </div>

      {result && (
        <div className="panel mt-8 rounded-lg p-5 sm:p-6">
          <h2 className="font-medium text-white">{result.interpretation.summary}</h2>
          <ul className="mt-6 space-y-2">
            {Object.entries(result.deltas)
              .filter(([, d]) => Math.abs(d) > 0.05)
              .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
              .slice(0, 5)
              .map(([slug]) => {
                const p = PARTIES.find((x) => x.slug === slug);
                return (
                  <li key={slug} className="flex justify-between text-sm">
                    <span>{p?.shortName ?? slug}</span>
                    <span className="font-mono-data tabular-nums text-[var(--muted)]">
                      {(result.before[slug] ?? 0).toFixed(1)}% → {(result.after[slug] ?? 0).toFixed(1)}%
                    </span>
                  </li>
                );
              })}
          </ul>
        </div>
      )}
    </PageShell>
  );
}
