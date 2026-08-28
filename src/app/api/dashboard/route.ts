import { NextResponse } from "next/server";
import { loadDashboardSnapshot } from "@/lib/refresh/dailyRefresh";

export async function GET() {
  const snapshot = await loadDashboardSnapshot();
  if (!snapshot) {
    return NextResponse.json({ ok: false, message: "Snapshot non disponibile" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, snapshot });
}
