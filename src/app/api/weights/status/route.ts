import { NextResponse } from "next/server";
import { loadLatestSnapshot } from "@/lib/weights/factorCollector";
import { FACTOR_COUNT } from "@/lib/weights/factorRegistry";

export async function GET() {
  const snapshot = await loadLatestSnapshot();
  return NextResponse.json({
    factorCount: FACTOR_COUNT,
    date: snapshot?.date ?? null,
    collectedAt: snapshot?.collectedAt ?? null,
    sources: snapshot?.sources ?? [],
  });
}
