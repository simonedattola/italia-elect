"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader, PageShell } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import type { RandomScenario } from "@/lib/experiences/randomScenarios";
import { RANDOM_SCENARIO_SESSION_KEY } from "@/lib/experiences/randomScenarioHandoff";

function saveScenarioForSimula(scenario: RandomScenario) {
  sessionStorage.setItem(
    RANDOM_SCENARIO_SESSION_KEY,
    JSON.stringify({
      title: scenario.title,
      description: scenario.description,
      partyVoteAdjustments: scenario.voteImpact,
    }),
  );
}

export default function ScenarioCasualePage() {
  const [scenario, setScenario] = useState<RandomScenario | null>(null);
  const [pending, setPending] = useState(false);

  async function generate() {
    setPending(true);
    try {
      const res = await fetch("/api/random-scenario");
      const data = await res.json();
      if (data.ok) setScenario(data.scenario);
    } finally {
      setPending(false);
    }
  }

  return (
    <PageShell narrow>
      <PageHeader title="Scenario" />

      <Button onClick={generate} disabled={pending} size="lg">
        {pending ? "…" : "Genera"}
      </Button>

      {scenario && (
        <div className="panel mt-8 rounded-lg p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-white">{scenario.title}</h2>

          <p className="mt-2 text-sm text-[var(--muted)]">{scenario.description}</p>

          <ul className="mt-6 space-y-1 text-sm text-[var(--muted)]">
            {scenario.effects.map((e) => (
              <li key={e.label}>{e.label}: {e.before} → {e.after}</li>
            ))}
          </ul>

          <ul className="mt-6 space-y-1 font-mono-data text-sm text-[var(--muted)]">
            {Object.entries(scenario.voteImpact).map(([party, delta]) => (
              <li key={party}>
                {party}: {delta >= 0 ? "+" : ""}{delta}%
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/simula" onClick={() => saveScenarioForSimula(scenario)}>
                Simula con questo scenario
              </Link>
            </Button>
            <Button onClick={generate} variant="outline">Nuovo</Button>
          </div>
        </div>
      )}
    </PageShell>
  );
}
