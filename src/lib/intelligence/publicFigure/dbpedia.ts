/**
 * DBpedia lookup — arricchimento biografico / tipizzazione.
 */

export interface DBpediaHit {
  uri: string;
  label: string;
  comment: string;
  types: string[];
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "ItaliaElect/2.2 (electoral-simulator; educational)",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

export async function lookupDBpedia(name: string): Promise<DBpediaHit | null> {
  const url =
    `https://lookup.dbpedia.org/api/search?query=${encodeURIComponent(name)}` +
    `&format=json&maxResults=5`;
  type Doc = {
    label?: string[];
    comment?: string[];
    resource?: string[];
    typeName?: string[];
  };
  type Res = { docs?: Doc[] };
  const data = await fetchJson<Res>(url);
  const docs = data?.docs ?? [];
  if (!docs.length) return null;

  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const target = norm(name);

  const doc =
    docs.find((d) => norm(stripHtml(d.label?.[0] ?? "")) === target) ??
    docs.find((d) => norm(stripHtml(d.label?.[0] ?? "")).includes(target)) ??
    docs[0];

  if (!doc?.resource?.[0]) return null;
  const label = stripHtml(doc.label?.[0] ?? name);
  if (norm(label) !== target && !norm(label).includes(target)) {
    // Evita match rumorosi su omonimi/redirect deboli
    const scoreTypes = (doc.typeName ?? []).join(" ").toLowerCase();
    if (!/person|politician|agent/.test(scoreTypes)) return null;
  }

  return {
    uri: doc.resource[0],
    label,
    comment: stripHtml(doc.comment?.[0] ?? ""),
    types: doc.typeName ?? [],
  };
}
