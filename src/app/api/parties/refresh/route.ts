import { NextResponse } from "next/server";
import { refreshParties } from "@/lib/electoral/partyRegistryServer";
import { getPartiesSnapshot } from "@/lib/electoral/parties";

export async function POST() {
  const result = await refreshParties({ force: true });
  return NextResponse.json(result);
}

export async function GET() {
  const result = await refreshParties();
  const parties = getPartiesSnapshot().map((p) => ({
    slug: p.slug,
    name: p.name,
    aiDetected: p.aiDetected ?? false,
  }));
  return NextResponse.json({ ...result, parties });
}
