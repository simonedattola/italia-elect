"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CandidateProfile, PartyResult } from "@/types/simulation";
import { getPartyHistory } from "@/lib/electoral/historical";

const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
};

export function NationalBarChart({ results }: { results: PartyResult[] }) {
  const data = results.slice(0, 8).map((r) => ({
    name: r.shortName,
    pct: r.percentage,
    low: r.percentageLow,
    high: r.percentageHigh,
    color: r.color,
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="name" tick={{ fill: "var(--muted)", fontSize: 12 }} />
          <YAxis tick={{ fill: "var(--muted)", fontSize: 12 }} unit="%" />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="pct" radius={[4, 4, 0, 0]} name="% nazionale">
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SwingChart({ results }: { results: PartyResult[] }) {
  const data = results
    .filter((r) => Math.abs(r.swing) > 0.05)
    .map((r) => ({
      name: r.shortName,
      swing: r.swing,
      color: r.swing >= 0 ? "#003399" : "#C8102E",
    }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis type="number" tick={{ fill: "var(--muted)", fontSize: 12 }} unit="pt" />
          <YAxis type="category" dataKey="name" tick={{ fill: "var(--muted)", fontSize: 12 }} width={48} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="swing" name="Swing vs baseline" radius={[0, 4, 4, 0]}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function HistoryLineChart({ partySlug }: { partySlug: string }) {
  const data = getPartyHistory(partySlug).map((h) => ({
    label: `${h.year}`,
    pct: h.percentage,
    type: h.type,
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="label" tick={{ fill: "var(--muted)", fontSize: 12 }} />
          <YAxis tick={{ fill: "var(--muted)", fontSize: 12 }} unit="%" />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend />
          <Line
            type="monotone"
            dataKey="pct"
            name="Consenso storico"
            stroke="#003399"
            strokeWidth={2}
            dot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CandidateRadar({ profile }: { profile: CandidateProfile }) {
  const data = [
    { dim: "Notorietà", value: profile.notoriety },
    { dim: "Credibilità", value: profile.credibility },
    { dim: "Leadership", value: profile.leadership },
    { dim: "Comunicazione", value: profile.communication },
    { dim: "Mobilitazione", value: profile.mobilization },
    { dim: "Compatibilità", value: profile.partyCompatibility },
  ];

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <RadarChart data={data}>
          <PolarGrid stroke="var(--border)" />
          <PolarAngleAxis dataKey="dim" tick={{ fill: "var(--muted)", fontSize: 11 }} />
          <Radar
            name="Profilo"
            dataKey="value"
            stroke="#C8102E"
            fill="#C8102E"
            fillOpacity={0.25}
          />
          <Tooltip contentStyle={tooltipStyle} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SeatsChart({
  chamber,
  senate,
  results,
}: {
  chamber: Record<string, number>;
  senate: Record<string, number>;
  results: PartyResult[];
}) {
  const data = results
    .filter((r) => (chamber[r.partySlug] ?? 0) + (senate[r.partySlug] ?? 0) > 0)
    .map((r) => ({
      name: r.shortName,
      Camera: chamber[r.partySlug] ?? 0,
      Senato: senate[r.partySlug] ?? 0,
      color: r.color,
    }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="name" tick={{ fill: "var(--muted)", fontSize: 12 }} />
          <YAxis tick={{ fill: "var(--muted)", fontSize: 12 }} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend />
          <Bar dataKey="Camera" fill="#003399" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Senato" fill="#C8102E" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
