import { NextResponse } from "next/server";
import { dailyRefresh } from "@/lib/refresh/dailyRefresh";

export async function POST() {
  const snapshot = await dailyRefresh();
  return NextResponse.json({ ok: true, snapshot });
}
