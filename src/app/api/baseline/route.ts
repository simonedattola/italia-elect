import { NextResponse } from "next/server";
import { buildPollingBaseline } from "@/lib/electoral/dynamicBaseline";
import { buildProvincialMapFromNational } from "@/lib/electoral/provincialMap";

export async function GET() {
  const meta = buildPollingBaseline();
  const provincialMap = buildProvincialMapFromNational(meta.shares, { seed: 2026 });
  return NextResponse.json({
    ok: true,
    baseline: meta.shares,
    pollOnly: meta.pollOnlyShares,
    provincialMap,
    meta: {
      asOf: meta.asOf,
      institutes: meta.institutes,
      pollCount: meta.pollAggregate.pollCount,
      reliability: meta.pollAggregate.sampleWeightedReliability,
      methodology: meta.methodology,
      sources: meta.sources,
    },
  });
}
