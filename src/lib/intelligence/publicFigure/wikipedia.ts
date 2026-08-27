/**
 * Wikipedia IT — Candidate Knowledge Retrieval.
 */

export interface WikipediaPage {
  title: string;
  extract: string;
  url: string;
  categories: string[];
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

export async function searchWikipediaIt(
  query: string,
  limit = 5
): Promise<{ title: string; snippet: string; pageid: number }[]> {
  const url =
    `https://it.wikipedia.org/w/api.php?action=query&list=search` +
    `&srsearch=${encodeURIComponent(query)}&srlimit=${limit}&format=json&origin=*`;
  type Res = {
    query?: { search?: { title: string; snippet: string; pageid: number }[] };
  };
  const data = await fetchJson<Res>(url);
  return data?.query?.search ?? [];
}

export async function fetchWikipediaSummary(
  title: string
): Promise<WikipediaPage | null> {
  const summaryUrl = `https://it.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
    title.replace(/ /g, "_")
  )}`;
  type Summary = {
    title?: string;
    extract?: string;
    content_urls?: { desktop?: { page?: string } };
    type?: string;
  };
  const summary = await fetchJson<Summary>(summaryUrl);
  if (!summary?.extract || summary.type === "disambiguation") return null;

  const catsUrl =
    `https://it.wikipedia.org/w/api.php?action=query&prop=categories` +
    `&titles=${encodeURIComponent(title)}&cllimit=20&format=json&origin=*`;
  type Cats = {
    query?: {
      pages?: Record<string, { categories?: { title: string }[] }>;
    };
  };
  const cats = await fetchJson<Cats>(catsUrl);
  const page = cats?.query?.pages ? Object.values(cats.query.pages)[0] : undefined;
  const categories = (page?.categories ?? [])
    .map((c) => c.title.replace(/^Categoria:/, ""))
    .filter((c) => !c.startsWith("Pagine "));

  return {
    title: summary.title ?? title,
    extract: summary.extract,
    url:
      summary.content_urls?.desktop?.page ??
      `https://it.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`,
    categories,
  };
}
