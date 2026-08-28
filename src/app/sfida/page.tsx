"use client";

import { useState } from "react";
import { PageHeader, PageShell } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PARTIES } from "@/lib/electoral/parties";

const PRESETS = [
  { firstName: "Giorgia", lastName: "Meloni", partySlug: "fratelli-ditalia", description: "Presidente del Consiglio, leader FdI" },
  { firstName: "Elly", lastName: "Schlein", partySlug: "partito-democratico", description: "Segretaria Partito Democratico" },
];

export default function SfidaPage() {
  const [p1, setP1] = useState(PRESETS[0]!);
  const [p2, setP2] = useState(PRESETS[1]!);
  const [result, setResult] = useState<{
    player1: { name: string; sharePct: number; seats: number };
    player2: { name: string; sharePct: number; seats: number };
    winner: { name: string };
    marginPct: number;
  } | null>(null);
  const [pending, setPending] = useState(false);

  async function simulate() {
    setPending(true);
    try {
      const res = await fetch("/api/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player1: p1, player2: p2 }),
      });
      const data = await res.json();
      if (data.ok) setResult(data);
    } finally {
      setPending(false);
    }
  }

  return (
    <PageShell narrow>
      <PageHeader title="Sfida" />

      <div className="grid gap-6 sm:grid-cols-2">
        {[
          { label: "1", state: p1, set: setP1 },
          { label: "2", state: p2, set: setP2 },
        ].map((box) => (
          <div key={box.label} className="panel space-y-3 rounded-lg p-4 sm:p-5">
            <p className="text-sm font-medium text-white">{box.label}</p>
            <Input
              value={box.state.firstName}
              onChange={(e) => box.set({ ...box.state, firstName: e.target.value })}
            />
            <Input
              value={box.state.lastName}
              onChange={(e) => box.set({ ...box.state, lastName: e.target.value })}
            />
            <Select
              value={box.state.partySlug}
              onValueChange={(v) => box.set({ ...box.state, partySlug: v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PARTIES.map((p) => (
                  <SelectItem key={p.slug} value={p.slug}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              value={box.state.description}
              onChange={(e) => box.set({ ...box.state, description: e.target.value })}
              className="min-h-[80px]"
            />
          </div>
        ))}
      </div>

      <Button onClick={simulate} disabled={pending} className="mt-6 w-full sm:w-auto" size="lg">
        {pending ? "…" : "Simula"}
      </Button>

      {result && (
        <div className="panel mt-8 rounded-lg p-5 sm:p-6">
          <p className="text-lg text-white">
            {result.winner.name}
            <span className="text-[var(--muted)]"> +{result.marginPct.toFixed(1)}%</span>
          </p>
          <ul className="mt-4 space-y-2 text-sm text-[var(--muted)]">
            <li>
              {result.player1.name}: {result.player1.sharePct.toFixed(1)}% · {result.player1.seats} seggi
            </li>
            <li>
              {result.player2.name}: {result.player2.sharePct.toFixed(1)}% · {result.player2.seats} seggi
            </li>
          </ul>
        </div>
      )}
    </PageShell>
  );
}
