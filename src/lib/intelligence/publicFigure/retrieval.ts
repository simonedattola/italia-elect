/**
 * Candidate Knowledge Retrieval
 *
 * cache context → Wikidata → Wikipedia → DBpedia → istituzionale
 * → lista candidati scorati per Entity Resolution
 */

import {
  fetchWikidataPerson,
  searchWikidataCandidates,
  type WikidataPersonRaw,
} from "./wikidata";
import { fetchWikipediaSummary, searchWikipediaIt } from "./wikipedia";
import { lookupDBpedia } from "./dbpedia";
import {
  scoreEntityConfidence,
  type ResolutionSignals,
} from "./entityResolution";
import type { EntityCandidate, IdentifyContext, PublicFigureSource } from "./types";

export interface RetrievedEntity {
  person: WikidataPersonRaw;
  confidence: number;
  dbpediaUri?: string;
  dbpediaComment?: string;
  wikipediaCategories: string[];
  sources: PublicFigureSource[];
}

function toSignals(
  person: WikidataPersonRaw,
  firstName: string,
  lastName: string,
  ctx?: IdentifyContext,
  confirmed?: boolean
): ResolutionSignals {
  return {
    label: person.label,
    description: `${person.description} ${person.extract ?? ""}`,
    firstName,
    lastName,
    isItalian: person.isItalian,
    isPoliticianLike: person.isPoliticianLike,
    isEntrepreneur: person.isEntrepreneur,
    isMedia: person.isMedia,
    hasItWiki: Boolean(person.wikipediaUrl?.includes("it.wikipedia")),
    partyLabels: person.partyLabels,
    occupations: person.occupationLabels,
    positions: person.positionLabels,
    userPartySlug: ctx?.partySlug,
    userDescription: ctx?.description,
    confirmed,
  };
}

async function enrichFromWikipedia(person: WikidataPersonRaw): Promise<{
  extract?: string;
  categories: string[];
  url?: string;
}> {
  if (person.wikipediaTitle) {
    const page = await fetchWikipediaSummary(person.wikipediaTitle);
    if (page) {
      return { extract: page.extract, categories: page.categories, url: page.url };
    }
  }
  // Fallback: ricerca Wikipedia IT
  const hits = await searchWikipediaIt(person.label, 3);
  const hit = hits.find(
    (h) => h.title.toLowerCase() === person.label.toLowerCase()
  );
  if (!hit) return { categories: [] };
  const page = await fetchWikipediaSummary(hit.title);
  if (!page) return { categories: [] };
  return { extract: page.extract, categories: page.categories, url: page.url };
}

/**
 * Recupera e score-a candidati Entity Resolution.
 */
export async function retrievePublicFigureCandidates(
  firstName: string,
  lastName: string,
  ctx?: IdentifyContext
): Promise<RetrievedEntity[]> {
  const confirmedId = ctx?.confirmedWikidataId?.trim();
  let searchHits = await searchWikidataCandidates(firstName, lastName, 8);

  if (confirmedId && !searchHits.some((h) => h.id === confirmedId)) {
    searchHits = [{ id: confirmedId, label: `${firstName} ${lastName}`, description: "" }, ...searchHits];
  }

  // Se Wikidata non trova nulla, prova Wikipedia → poi Wikidata sul titolo
  if (!searchHits.length) {
    const wikiHits = await searchWikipediaIt(`${firstName} ${lastName}`, 5);
    for (const wh of wikiHits.slice(0, 3)) {
      // Non abbiamo mapping diretto title→Q; usiamo search wikidata sul titolo
      const viaTitle = await searchWikidataCandidates(
        wh.title.split(" ")[0] ?? firstName,
        wh.title.split(" ").slice(1).join(" ") || lastName,
        3
      );
      for (const v of viaTitle) {
        if (!searchHits.some((h) => h.id === v.id)) searchHits.push(v);
      }
    }
  }

  if (confirmedId) {
    searchHits = [
      ...searchHits.filter((h) => h.id === confirmedId),
      ...searchHits.filter((h) => h.id !== confirmedId),
    ];
  }

  const results: RetrievedEntity[] = [];

  for (const hit of searchHits.slice(0, 5)) {
    const person = await fetchWikidataPerson(hit.id);
    if (!person) continue;

    const wiki = await enrichFromWikipedia(person);
    if (wiki.extract && !person.extract) person.extract = wiki.extract;
    if (wiki.url && !person.wikipediaUrl) person.wikipediaUrl = wiki.url;

    const dbp = await lookupDBpedia(person.label);
    const confidence = scoreEntityConfidence(
      toSignals(person, firstName, lastName, ctx, hit.id === confirmedId)
    );

    const sources: PublicFigureSource[] = [...person.sources];
    if (dbp) {
      sources.push({
        title: "DBpedia",
        url: dbp.uri,
        type: "dbpedia",
      });
    }

    results.push({
      person: {
        ...person,
        wikiCategories: wiki.categories,
      },
      confidence,
      dbpediaUri: dbp?.uri,
      dbpediaComment: dbp?.comment,
      wikipediaCategories: wiki.categories,
      sources,
    });
  }

  results.sort((a, b) => b.confidence - a.confidence);
  return results;
}

export function toEntityCandidates(retrieved: RetrievedEntity[]): EntityCandidate[] {
  return retrieved.map((r) => ({
    wikidataId: r.person.wikidataId,
    label: r.person.label,
    description: r.person.description,
    confidence: r.confidence,
    wikipediaUrl: r.person.wikipediaUrl,
    roleCategory: r.person.roleCategory,
  }));
}
