"use client";

import {
  AreaChart,
  Area,
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

function GlassTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-[#0a0b10]/90 px-3 py-2 text-xs shadow-xl backdrop-blur-xl">
      <p className="mb-1.5 font-medium text-white">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="font-mono-data" style={{ color: p.color }}>
          {p.name}: {Number(p.value).toFixed(1)}%
        </p>
      ))}
    </div>
  );
}

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
        <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <defs>
            {topSlugs.map((slug) => {
              const p = PARTIES.find((x) => x.slug === slug);
              const color = p?.color ?? "#666";
              return (
                <linearGradient
                  key={slug}
                  id={`grad-${slug}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              );
            })}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} />
          <YAxis
            domain={[0, "auto"]}
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            width={32}
          />
          <Tooltip content={<GlassTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {topSlugs.map((slug) => {
            const p = PARTIES.find((x) => x.slug === slug);
            return (
              <Area
                key={slug}
                type="monotone"
                dataKey={slug}
                name={p?.shortName ?? slug}
                stroke={p?.color ?? "#666"}
                fill={`url(#grad-${slug})`}
                strokeWidth={slug === leaderSlug ? 2.5 : 1.25}
                dot={false}
                isAnimationActive
              />
            );
          })}
        </AreaChart>
      </ResponsiveContainer>
      {leader && (
        <p className="mt-2 text-xs text-[var(--muted)]">
          Proiezione basata su scenari Monte Carlo del leader ({leader.shortName}).
        </p>
      )}
    </div>
  );
}
