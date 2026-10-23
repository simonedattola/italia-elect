import { loadElection } from "@/data/generated/registry";
import { colorForList, ideologyForList } from "@/lib/electoral/canonical";

export const runtime = "nodejs";

export async function GET() {
  const record = await loadElection("comunali-2024-07-28");
  const municipalities = (record?.municipalities ?? []).map((place) => ({
    id: place.id,
    name: place.name,
    note: place.note,
    councilSeats: Math.max(0, ...place.lists.map((list) => list.seats ?? 0)),
    lists: place.lists.map((list) => ({
      id: list.id,
      name: list.name,
      color: colorForList(list.id),
      percentage: list.percentage,
      ideology: ideologyForList(list.id),
    })),
  }));
  return Response.json({ municipalities });
}
