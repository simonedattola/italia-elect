/**
 * Wikidata — ricerca multi-candidato + claim (occupazione, incarichi, partiti).
 */

import { resolveInstitutionalPositions } from "./institutional";
import type { PublicFigureSource, RoleCategory } from "./types";
import { inferRoleCategory, nameMatchScore } from "./entityResolution";

export interface WikidataPersonRaw {
  wikidataId: string;
  label: string;
  description: string;
  wikipediaTitle?: string;
  wikipediaUrl?: string;
  extract?: string;
  wikiCategories: string[];
  isItalian: boolean;
  isPoliticianLike: boolean;
  isEntrepreneur: boolean;
  isMedia: boolean;
  occupationIds: string[];
  occupationLabels: string[];
  positionIds: string[];
  positionLabels: string[];
  partyIds: string[];
  partyLabels: string[];
  importantDates: string[];
  roleCategory: RoleCategory;
  institutionalSources: PublicFigureSource[];
  sources: PublicFigureSource[];
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "ItaliaElect/2.2 (electoral-simulator; educational)",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function claimIds(
  claims: Record<string, { mainsnak?: { datavalue?: { value?: unknown } } }[]> | undefined,
  prop: string
): string[] {
  const out: string[] = [];
  for (const c of claims?.[prop] ?? []) {
    const id = (c.mainsnak?.datavalue?.value as { id?: string } | undefined)?.id;
    if (id) out.push(id);
  }
  return out;
}

function claimTimes(
  claims: Record<string, { mainsnak?: { datavalue?: { value?: unknown } } }[]> | undefined,
  prop: string
): string[] {
  const out: string[] = [];
  for (const c of claims?.[prop] ?? []) {
    const v = c.mainsnak?.datavalue?.value as { time?: string } | undefined;
    if (v?.time) {
      const m = v.time.match(/([+-]?\d{4})/);
      if (m) out.push(m[1].replace(/^\+/, ""));
    }
  }
  return out;
}

async function resolveLabels(ids: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(ids)].slice(0, 40);
  if (!unique.length) return {};
  const url =
    `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${unique.join("|")}` +
    `&props=labels&languages=it|en&format=json&origin=*`;
  type Res = {
    entities?: Record<
      string,
      { labels?: { it?: { value: string }; en?: { value: string } } }
    >;
  };
  const data = await fetchJson<Res>(url);
  const map: Record<string, string> = {};
  for (const id of unique) {
    const ent = data?.entities?.[id];
    const label = ent?.labels?.it?.value ?? ent?.labels?.en?.value;
    if (label) map[id] = label;
  }
  return map;
}

const POLITICIAN_OCC = new Set([
  "Q82955", // politician
  "Q372436", // statesperson
  "Q193391", // diplomat
  "Q11774156", // political scientist sometimes
]);
const ENTREPRENEUR_OCC = new Set([
  "Q43845", // businessman
  "Q131524", // entrepreneur
  "Q1420621", // media proprietor
  "Q2285706", // head of business
]);
const MEDIA_OCC = new Set([
  "Q947873", // television producer
  "Q10800557", // film actor
  "Q33999", // actor
  "Q1930187", // journalist
  "Q2405480", // voice actor / related
]);

export async function searchWikidataCandidates(
  firstName: string,
  lastName: string,
  limit = 8
): Promise<{ id: string; label: string; description: string }[]> {
  const q = encodeURIComponent(`${firstName} ${lastName}`);
  const searchUrl =
    `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${q}` +
    `&language=it&uselang=it&type=item&limit=${limit}&format=json&origin=*`;
  type SearchRes = {
    search?: { id: string; label: string; description?: string }[];
  };
  const search = await fetchJson<SearchRes>(searchUrl);
  const hits = search?.search ?? [];
  return hits
    .filter((h) => nameMatchScore(h.label, firstName, lastName) >= 18)
    .map((h) => ({
      id: h.id,
      label: h.label,
      description: h.description ?? "",
    }));
}

export async function fetchWikidataPerson(
  wikidataId: string
): Promise<WikidataPersonRaw | null> {
  const entityUrl = `https://www.wikidata.org/wiki/Special:EntityData/${wikidataId}.json`;
  type EntityRes = {
    entities?: Record<
      string,
      {
        labels?: { it?: { value: string }; en?: { value: string } };
        descriptions?: { it?: { value: string }; en?: { value: string } };
        claims?: Record<string, { mainsnak?: { datavalue?: { value?: unknown } } }[]>;
        sitelinks?: { itwiki?: { title: string }; enwiki?: { title: string } };
      }
    >;
  };
  const entity = await fetchJson<EntityRes>(entityUrl);
  const ent = entity?.entities?.[wikidataId];
  if (!ent) return null;

  const label = ent.labels?.it?.value ?? ent.labels?.en?.value ?? wikidataId;
  const description =
    ent.descriptions?.it?.value ?? ent.descriptions?.en?.value ?? "";

  const occupationIds = claimIds(ent.claims, "P106").slice(0, 8);
  const positionIds = claimIds(ent.claims, "P39").slice(0, 12);
  const partyIds = claimIds(ent.claims, "P102").slice(0, 8);
  const citizenship = claimIds(ent.claims, "P27");
  const birthYears = claimTimes(ent.claims, "P569");
  const deathYears = claimTimes(ent.claims, "P570");

  const labelIds = [...occupationIds, ...positionIds, ...partyIds];
  const labels = await resolveLabels(labelIds);

  const occupationLabels = occupationIds.map((id) => labels[id] ?? id);
  const partyLabels = partyIds.map((id) => labels[id] ?? id);
  const { positions: institutionalPositions, sources: institutionalSources } =
    resolveInstitutionalPositions(positionIds);
  const positionLabels = [
    ...institutionalPositions,
    ...positionIds
      .map((id) => labels[id])
      .filter((x): x is string => Boolean(x))
      .filter((l) => !institutionalPositions.includes(l)),
  ].slice(0, 10);

  const isItalian =
    citizenship.includes("Q38") ||
    Boolean(ent.sitelinks?.itwiki) ||
    /ital/i.test(description);

  const isPoliticianLike =
    occupationIds.some((o) => POLITICIAN_OCC.has(o)) ||
    positionIds.length > 0 ||
    /politic|deputat|senator|minister|premier|sindac|statista/i.test(description);

  const isEntrepreneur =
    occupationIds.some((o) => ENTREPRENEUR_OCC.has(o)) ||
    /imprenditor|business|editore/i.test(description);

  const isMedia =
    occupationIds.some((o) => MEDIA_OCC.has(o)) ||
    /giornalist|conduttor|attore|cantant|televis|presentator/i.test(description);

  const roleCategory = inferRoleCategory({
    isPoliticianLike,
    isEntrepreneur,
    isMedia,
    description,
    isLocalHint: /sindac|regionale|comunale/i.test(description + positionLabels.join(" ")),
  });

  const wikiTitle = ent.sitelinks?.itwiki?.title ?? ent.sitelinks?.enwiki?.title;
  let wikipediaUrl: string | undefined;
  let extract: string | undefined;
  const wikiCategories: string[] = [];

  if (wikiTitle) {
    const lang = ent.sitelinks?.itwiki ? "it" : "en";
    const summaryUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
      wikiTitle.replace(/ /g, "_")
    )}`;
    type Summary = {
      extract?: string;
      content_urls?: { desktop?: { page?: string } };
    };
    const summary = await fetchJson<Summary>(summaryUrl);
    if (summary?.extract) extract = summary.extract;
    wikipediaUrl =
      summary?.content_urls?.desktop?.page ??
      `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(wikiTitle.replace(/ /g, "_"))}`;
  }

  const importantDates = [
    ...birthYears.map((y) => `Nascita: ${y}`),
    ...deathYears.map((y) => `Decesso: ${y}`),
  ];

  const sources: PublicFigureSource[] = [
    {
      title: `Wikidata ${wikidataId}`,
      url: `https://www.wikidata.org/wiki/${wikidataId}`,
      type: "wikidata",
    },
    ...(wikipediaUrl
      ? [{ title: "Wikipedia", url: wikipediaUrl, type: "wikipedia" as const }]
      : []),
    ...institutionalSources,
  ];

  return {
    wikidataId,
    label,
    description,
    wikipediaTitle: wikiTitle,
    wikipediaUrl,
    extract,
    wikiCategories,
    isItalian,
    isPoliticianLike,
    isEntrepreneur,
    isMedia,
    occupationIds,
    occupationLabels,
    positionIds,
    positionLabels,
    partyIds,
    partyLabels,
    importantDates,
    roleCategory,
    institutionalSources,
    sources,
  };
}

/** Compat: singolo best-effort lookup (nome esatto). */
export async function lookupWikidataPerson(
  firstName: string,
  lastName: string
): Promise<{
  wikidataId: string;
  label: string;
  description: string;
  wikipediaUrl?: string;
  extract?: string;
  isPoliticianLike: boolean;
  isItalianRelevant: boolean;
  occupations: string[];
  positions: string[];
  sources: { title: string; url?: string; type: "wikidata" | "wikipedia" }[];
} | null> {
  const candidates = await searchWikidataCandidates(firstName, lastName, 5);
  if (!candidates.length) return null;
  const person = await fetchWikidataPerson(candidates[0].id);
  if (!person) return null;
  if (
    !person.isPoliticianLike &&
    !person.isEntrepreneur &&
    !person.isMedia &&
    !/imprenditor|giornalist|conduttor|attore|cantant|criminal|gioiell/i.test(
      person.description
    )
  ) {
    return null;
  }
  return {
    wikidataId: person.wikidataId,
    label: person.label,
    description: person.description,
    wikipediaUrl: person.wikipediaUrl,
    extract: person.extract,
    isPoliticianLike: person.isPoliticianLike,
    isItalianRelevant: person.isItalian,
    occupations: person.occupationLabels,
    positions: person.positionLabels,
    sources: person.sources.filter(
      (s): s is { title: string; url?: string; type: "wikidata" | "wikipedia" } =>
        s.type === "wikidata" || s.type === "wikipedia"
    ),
  };
}
