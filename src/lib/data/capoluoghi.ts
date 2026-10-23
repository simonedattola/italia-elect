import cities from "@/data/generated/eligendo-capoluoghi.json";
import { canonicalListId, colorForList, ideologyForList } from "@/lib/electoral/canonical";

interface CityFile {
  cities: {
    name: string;
    date: string;
    turnout: number | null;
    lists: { name: string; percentage: number; votes: number | null; seats: number | null }[];
  }[];
}

export function capoluogoLists(name: string | undefined): {
  id: string;
  name: string;
  color: string;
  percentage: number;
  ideology: number;
}[] {
  if (!name) return [];
  const city = (cities as CityFile).cities.find((item) => item.name.toLowerCase() === name.toLowerCase());
  if (!city) return [];
  const merged = new Map<string, { id: string; name: string; color: string; percentage: number; ideology: number }>();
  for (const list of city.lists) {
    const id = canonicalListId(list.name);
    const prev = merged.get(id);
    if (!prev) {
      merged.set(id, {
        id,
        name: list.name,
        color: colorForList(id),
        percentage: list.percentage,
        ideology: ideologyForList(id),
      });
    } else prev.percentage += list.percentage;
  }
  const rows = [...merged.values()];
  const sum = rows.reduce((total, list) => total + list.percentage, 0) || 1;
  return rows
    .map((list) => ({ ...list, percentage: (list.percentage / sum) * 100 }))
    .sort((a, b) => b.percentage - a.percentage);
}

export function capoluogoOptions(): { id: string; name: string; date: string; turnout: number | null; lists: ReturnType<typeof capoluogoLists>; councilSeats: number }[] {
  return (cities as CityFile).cities.map((city) => ({
    id: `capoluogo-${city.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    name: city.name,
    date: city.date,
    turnout: city.turnout,
    lists: capoluogoLists(city.name),
    councilSeats: Math.max(
      0,
      city.lists.reduce((sum, list) => sum + (list.seats ?? 0), 0),
    ),
  }));
}
