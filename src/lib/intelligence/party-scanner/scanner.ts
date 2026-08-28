import type { PartyDefinition } from "@/types/simulation";
import { slugify } from "@/lib/utils";
import { CORE_PARTIES } from "@/lib/electoral/coreParties";
import { EMBEDDED_POLLS } from "@/lib/intelligence/polls";
import { PARTY_WATCHLIST, type PartyWatchEntry } from "./watchlist";

export type ScanResult = {
  discovered: PartyDefinition[];
  sources: string[];
  scannedAt: string;
};

/** Normalizza chiavi sondaggio → slug */
function normalizePollKey(key: string): string {
  return slugify(key.replace(/_/g, " "));
}

function fromWatchEntry(entry: PartyWatchEntry): PartyDefinition {
  return {
    slug: entry.slug,
    name: entry.name,
    shortName: entry.shortName,
    color: entry.color,
    ideology: entry.ideology,
    ideologyScore: entry.ideologyScore,
    coalitionFamily: entry.coalitionFamily,
    foundedYear: entry.foundedYear,
    aiDetected: true,
  };
}

/**
 * Scansiona sondaggi incorporati e watchlist per partiti non ancora nel registry.
 */
export function scanPartiesFromSources(
  existingSlugs: Set<string>,
): ScanResult {
  const discovered: PartyDefinition[] = [];
  const sources: string[] = [];
  const seen = new Set<string>();

  // 1. Watchlist — Futuro Nazionale e altri emergenti
  for (const entry of PARTY_WATCHLIST) {
    if (existingSlugs.has(entry.slug) || seen.has(entry.slug)) continue;

    let triggered = false;
    for (const poll of EMBEDDED_POLLS) {
      for (const [rawKey, share] of Object.entries(poll.shares)) {
        const norm = normalizePollKey(rawKey);
        const aliases = entry.pollAliases.map(normalizePollKey);
        if (
          aliases.includes(norm) ||
          entry.pollAliases.some((a) => rawKey.toLowerCase().includes(a))
        ) {
          if (share >= (entry.minPollShare ?? 0.3)) {
            triggered = true;
            sources.push(`${poll.institute}:${rawKey}=${share}%`);
            break;
          }
        }
      }
      if (triggered) break;
    }

    // Watchlist partiti emergenti: promuovi anche senza quota se in lista monitorata
    if (!triggered && entry.slug === "futuro-nazionale") {
      triggered = true;
      sources.push("watchlist:futuro-nazionale");
    }

    if (triggered) {
      discovered.push(fromWatchEntry(entry));
      seen.add(entry.slug);
    }
  }

  // 2. Chiavi sconosciute nei sondaggi → partito generico AI
  for (const poll of EMBEDDED_POLLS) {
    for (const [rawKey, share] of Object.entries(poll.shares)) {
      const slug = normalizePollKey(rawKey);
      if (
        existingSlugs.has(slug) ||
        seen.has(slug) ||
        slug.length < 2 ||
        share < 0.8
      ) {
        continue;
      }

      const watchHit = PARTY_WATCHLIST.find(
        (w) =>
          w.pollAliases.some((a) => normalizePollKey(a) === slug) ||
          w.slug === slug,
      );
      if (watchHit) continue;

      discovered.push({
        slug,
        name: rawKey.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        shortName: rawKey.slice(0, 6).toUpperCase(),
        color: "#64748B",
        ideology: "CENTER",
        ideologyScore: 0,
        coalitionFamily: "ALTRO",
        aiDetected: true,
      });
      seen.add(slug);
      sources.push(`poll-discovery:${poll.institute}:${rawKey}`);
    }
  }

  return {
    discovered,
    sources,
    scannedAt: new Date().toISOString(),
  };
}

/**
 * Marca partiti watchlist già presenti come rilevati AI.
 */
export function markAiDetectedParties(parties: PartyDefinition[]): void {
  const coreSlugs = new Set(CORE_PARTIES.map((p) => p.slug));
  const watchSlugs = new Set(PARTY_WATCHLIST.map((w) => w.slug));
  for (const p of parties) {
    if (watchSlugs.has(p.slug) && !coreSlugs.has(p.slug)) {
      p.aiDetected = true;
    }
  }
}
