"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { PARTIES } from "@/lib/electoral/parties";
import type { PartyResult } from "@/types/simulation";
import type { SimulationScenarios } from "@/types/intelligence";
import { getPartyHistory } from "@/lib/electoral/historical";

type Props = {
  nationalResults: PartyResult[];
  scenarios?: SimulationScenarios | null;
  leaderSlug: string;
};

/**
 * Timeline sintetica: storico partito + scenario worst/mean/best come proiezione.
 * (Il Trend Forecaster full-run è disponibile server-side; qui UI leggera.)
 */
export function TrendTimeline({ nationalResults, scenarios, leaderSlug }: Props) {
  const history = getPartyHistory(leaderSlug);
  const leader = nationalResults.find((r) => r.partySlug === leaderSlug);
  const topSlugs = nationalResults.slice(0, 5).map((r) => r.partySlug);

  const histPoints = history.slice(-6).map((h) => {
    const row: Record<string, string | number> = {
      label: String(h.year),
    };
    for (const slug of topSlugs) {
      const series = getPartyHistory(slug);
      const hit = series.find((x) => x.year === h.year);
      row[slug] = hit?.percentage ?? 0;
    }
    return row;
  });

  const now = new Date().getFullYear();
  const proj = [
    {
      label: `${now} p10`,
      ...Object.fromEntries(
        topSlugs.map((s) => [
          s,
          scenarios?.worst?.[s] ??
            nationalResults.find((r) => r.partySlug === s)?.percentageLow ??
            0,
        ]),
      ),
    },
    {
      label: `${now} medio`,
      ...Object.fromEntries(
        topSlugs.map((s) => [
          s,
          scenarios?.mean?.[s] ??
            nationalResults.find((r) => r.partySlug === s)?.percentage ??
            0,
        ]),
      ),
    },
    {
      label: `${now} p90`,
      ...Object.fromEntries(
        topSlugs.map((s) => [
          s,
          scenarios?.best?.[s] ??
            nationalResults.find((r) => r.partySlug === s)?.percentageHigh ??
            0,
        ]),
      ),
    },
  ];

  const data = [...histPoints, ...proj];

  return (
    <div className="h-[320px] w-full" id="trend-timeline">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted)" }} />
          <YAxis
            domain={[0, "auto"]}
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            width={32}
          />
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {topSlugs.map((slug) => {
            const p = PARTIES.find((x) => x.slug === slug);
            return (
              <Line
                key={slug}
                type="monotone"
                dataKey={slug}
                name={p?.shortName ?? slug}
                stroke={p?.color ?? "#666"}
                strokeWidth={slug === leaderSlug ? 2.5 : 1.5}
                dot={false}
                isAnimationActive
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
      {leader && (
        <p className="mt-2 text-xs text-[var(--muted)]">
          Proiezione basata su scenari Monte Carlo del leader ({leader.shortName}).
          Per horizon multi-data completa usa il Trend Forecaster server.
        </p>
      )}
    </div>
  );
}
