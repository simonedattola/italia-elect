import { PARTIES } from "./parties";
import { scanPartiesFromSources } from "../intelligence/party-scanner";
import { mergeDiscoveredParties } from "./partyRegistryCore";
import {
  computeCompositeBaseline,
  aggregatePollsLast30Days,
} from "../data/realtime/BaselineComposita";
import {
  computeEconomicSentiment,
  economicPartyShocks,
} from "../intelligence/economicModel";
import {
  analyzeEvents,
  detectRegimeFromEvents,
} from "../intelligence/newsAnalysis";
import type { PollAggregate } from "@/types/intelligence";
import {
  aggregatePolls,
  EMBEDDED_POLLS,
  type RawPoll,
} from "../intelligence/polls";

/** Finestra massima per sondaggi nel corpus (giorni). */
const POLL_MAX_AGE_DAYS = 120;

export type PollingBaselineMeta = {
  shares: Record<string, number>;
  pollOnlyShares: Record<string, number>;
  pollAggregate: PollAggregate;
  institutes: string[];
  asOf: string;
  sources: string[];
  methodology: string;
};

function normalizeShares(shares: Record<string, number>): Record<string, number> {
  const sum = Object.values(shares).reduce((a, b) => a + b, 0) || 1;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(shares)) out[k] = (v / sum) * 100;
  return out;
}

function ensurePartiesScanned(): void {
  const scan = scanPartiesFromSources(new Set(PARTIES.map((p) => p.slug)));
  mergeDiscoveredParties(scan.discovered);
}

function applyShocks(
  baseline: Record<string, number>,
  shocks: Record<string, number>[],
): Record<string, number> {
  const out: Record<string, number> = { ...baseline };
  for (const shock of shocks) {
    for (const [slug, pts] of Object.entries(shock)) {
      out[slug] = (out[slug] ?? 0) + pts;
    }
  }
  for (const k of Object.keys(out)) out[k] = Math.max(0.2, out[k]!);
  const sum = Object.values(out).reduce((a, b) => a + b, 0) || 1;
  for (const k of Object.keys(out)) out[k] = (out[k]! / sum) * 100;
  return out;
}

function scaleShock(shock: Record<string, number>, weight: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(shock)) out[k] = v * (weight / 0.12);
  return out;
}

/** Corpus sondaggi: incorporati recenti (SWG, YouTrend, Ipsos, EMG, Termometro). */
export function getOfficialPollCorpus(now = Date.now()): RawPoll[] {
  const cutoff = now - POLL_MAX_AGE_DAYS * 86400000;
  return EMBEDDED_POLLS.filter(
    (p) => new Date(p.publishedAt).getTime() >= cutoff,
  );
}

/**
 * Aggregato sondaggi con pesi algoritmo: freschezza, campione, affidabilità istituto.
 */
export function aggregateOfficialPolls(now = Date.now()): PollAggregate {
  ensurePartiesScanned();
  const corpus = getOfficialPollCorpus(now);
  return aggregatePolls(corpus.length > 0 ? corpus : EMBEDDED_POLLS, now);
}

/**
 * Aggregato sondaggi (ultimi 30 giorni per baseline composita).
 */
export function getPollOnlyShares(): Record<string, number> {
  return aggregatePollsLast30Days().shares;
}

/**
 * Baseline nazionale = composita elettorale + shock economia/eventi.
 */
export function buildPollingBaseline(now = Date.now()): PollingBaselineMeta {
  ensurePartiesScanned();
  const composite = computeCompositeBaseline(now);
  const pollAggregate = aggregateOfficialPolls(now);
  const pollOnlyShares = composite.pollCorrection;

  const economy = computeEconomicSentiment();
  const events = analyzeEvents();
  const regimeFlags = detectRegimeFromEvents(events, economy.index);

  const economyW = regimeFlags.crisisEconomic ? 0.14 : 0.08;
  const eventsW =
    regimeFlags.crisisPolitical || regimeFlags.international ? 0.12 : 0.06;

  const shares = applyShocks(composite.shares, [
    scaleShock(economicPartyShocks(economy), economyW),
    scaleShock(events.netPartyShocks, eventsW),
  ]);

  const sources = [
    ...pollAggregate.sources.map((s) => `${s.institute}:${s.publishedAt}`),
    ...events.sources.slice(0, 3),
    ...economy.sources.slice(0, 2),
    "baseline:composita-eligendo+sondaggi30gg",
  ];

  return {
    shares,
    pollOnlyShares,
    pollAggregate,
    institutes: pollAggregate.institutes,
    asOf: composite.asOf,
    sources,
    methodology: composite.methodology + " + shock economia/eventi",
  };
}

/** Baseline operativa per UI, simulazioni e dashboard. */
export function getCurrentBaseline(): Record<string, number> {
  return buildPollingBaseline().shares;
}

export function computeDynamicBaseline(): Record<string, number> {
  return getCurrentBaseline();
}
