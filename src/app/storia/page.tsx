"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { PageHeader, PageShell } from "@/components/layout/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { PARTIES } from "@/lib/electoral/parties";

export default function StoriaPage() {
  const [party, setParty] = useState("partito-democratico");
  const [timeline, setTimeline] = useState<Array<{ year: number; pct: number }>>([]);
  const [projections, setProjections] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    fetch(`/api/history?party=${party}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          setTimeline(d.timeline);
          setProjections(d.projections?.year2030);
        }
      });
  }, [party]);

  const partyColor = PARTIES.find((p) => p.slug === party)?.color ?? "#3b82f6";

  return (
    <PageShell>
      <PageHeader title="Storia" />

      <div className="space-y-2">
        <Label>Partito</Label>
        <Select value={party} onValueChange={setParty}>
          <SelectTrigger className="w-full sm:w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PARTIES.map((p) => (
              <SelectItem key={p.slug} value={p.slug}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="panel mt-8 rounded-lg p-4 sm:p-6">
        <div className="h-64 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" tick={{ fill: "var(--muted)", fontSize: 12 }} />
              <YAxis tick={{ fill: "var(--muted)", fontSize: 12 }} unit="%" width={36} />
              <Tooltip
                contentStyle={{
                  background: "var(--card-solid)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="pct"
                stroke={partyColor}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {projections && (
        <div className="panel mt-6 rounded-lg p-5">
          <h2 className="text-sm font-medium text-white">2030</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {Object.entries(projections).map(([slug, pct]) => {
              const p = PARTIES.find((x) => x.slug === slug);
              return (
                <li key={slug} className="flex justify-between text-sm text-[var(--muted)]">
                  <span>{p?.shortName ?? slug}</span>
                  <span className="font-mono-data tabular-nums">{pct}%</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </PageShell>
  );
}
