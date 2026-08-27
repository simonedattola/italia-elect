import { NextResponse } from "next/server";
import { refreshElectoralData } from "@/actions/data";

export async function POST() {
  const result = await refreshElectoralData();
  return NextResponse.json(result);
}

export async function GET() {
  const result = await refreshElectoralData();
  return NextResponse.json(result);
}
