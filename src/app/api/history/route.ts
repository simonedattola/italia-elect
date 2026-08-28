import { NextResponse } from "next/server";
import { HISTORICAL_NATIONAL } from "@/lib/electoral/historical";
import { getPartyHistory } from "@/lib/electoral/historical";

const EXTENDED_HISTORY = [
  { year: 1946, shares: { "partito-democratico": 35.2, "forza-italia": 0, lega: 0 } },
  { year: 1994, shares: { "forza-italia": 21.0, "partito-democratico": 20.4, lega: 0 } },
  ...HISTORICAL_NATIONAL.map((s) => ({ year: s.year, shares: s.shares })),
];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const party = searchParams.get("party") ?? "partito-democratico";
  const region = searchParams.get("region");

  const series = getPartyHistory(party);
  const timeline = EXTENDED_HISTORY.map((snap) => ({
    year: snap.year,
    pct: snap.shares[party] ?? 0,
  })).filter((p) => p.pct > 0);

  const latest = HISTORICAL_NATIONAL[HISTORICAL_NATIONAL.length - 1];
  const snapshots = EXTENDED_HISTORY.concat(
    latest ? [{ year: latest.year, shares: latest.shares }] : [],
  );

  return NextResponse.json({
    ok: true,
    party,
    region: region ?? "nazionale",
    timeline: timeline.length ? timeline : series.map((s) => ({ year: s.year, pct: s.percentage })),
    snapshots: snapshots.slice(-8),
    projections: {
      year2030: {
        "fratelli-ditalia": 27.5,
        "partito-democratico": 22.0,
        "movimento-5-stelle": 11.5,
        lega: 4.8,
        "futuro-nazionale": 9.5,
      },
    },
  });
}
