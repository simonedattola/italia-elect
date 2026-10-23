import { loadElection } from "@/data/generated/registry";
import { capoluogoOptions } from "@/lib/data/capoluoghi";
import { colorForList, ideologyForList } from "@/lib/electoral/canonical";

export const runtime = "nodejs";

export async function GET() {
  const capoluoghi = capoluogoOptions().map((city) => ({
    id: city.id,
    name: city.name,
    note: `Ultimo turno aperto: ${city.date}.${city.turnout != null ? ` Affluenza ${city.turnout.toFixed(1)}%.` : ""}`,
    councilSeats: city.councilSeats || 32,
    lists: city.lists,
  }));
  const record = await loadElection("comunali-2024-07-28");
  const extra = (record?.municipalities ?? [])
    .filter((place) => !capoluoghi.some((city) => city.name.toLowerCase() === place.name.toLowerCase()))
    .map((place) => ({
      id: place.id,
      name: place.name,
      note: place.note,
      councilSeats: Math.max(32, place.lists.reduce((sum, list) => sum + (list.seats ?? 0), 0)),
      lists: place.lists.map((list) => ({
        id: list.id,
        name: list.name,
        color: colorForList(list.id),
        percentage: list.percentage,
        ideology: ideologyForList(list.id),
      })),
    }));
  return Response.json({ municipalities: [...capoluoghi, ...extra] });
}
