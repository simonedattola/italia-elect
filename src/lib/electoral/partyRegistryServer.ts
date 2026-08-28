import "server-only";

import type { PartyDefinition } from "@/types/simulation";
import { scanPartiesFromSources } from "@/lib/intelligence/party-scanner";
import {
  PARTIES,
  getPartiesSnapshot,
  mergeDiscoveredParties,
} from "@/lib/electoral/partyRegistryCore";

const REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;

let lastRefreshAt = 0;
let refreshInFlight: Promise<RefreshPartiesResult> | null = null;
let intervalStarted = false;

export type RefreshPartiesResult = {
  ok: boolean;
  skipped?: boolean;
  added: string[];
  total: number;
  sources: string[];
  refreshedAt: string;
};

async function syncPartiesToDb(): Promise<void> {
  try {
    const { prisma } = await import("@/lib/prisma");
    for (const p of PARTIES) {
      await prisma.party.upsert({
        where: { slug: p.slug },
        create: {
          slug: p.slug,
          name: p.name,
          shortName: p.shortName,
          color: p.color,
          ideology: p.ideology,
          ideologyScore: p.ideologyScore,
          coalitionFamily: p.coalitionFamily,
          foundedYear: p.foundedYear ?? null,
          isActive: true,
        },
        update: {
          name: p.name,
          shortName: p.shortName,
          color: p.color,
          ideology: p.ideology,
          ideologyScore: p.ideologyScore,
          coalitionFamily: p.coalitionFamily,
          foundedYear: p.foundedYear ?? null,
          isActive: true,
        },
      });
    }
  } catch {
    // DB opzionale
  }
}

export async function refreshParties(
  options?: { force?: boolean },
): Promise<RefreshPartiesResult> {
  const force = options?.force ?? false;
  const now = Date.now();

  if (!force && now - lastRefreshAt < REFRESH_INTERVAL_MS) {
    return {
      ok: true,
      skipped: true,
      added: [],
      total: PARTIES.length,
      sources: [],
      refreshedAt: new Date(lastRefreshAt).toISOString(),
    };
  }

  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const existing = new Set(PARTIES.map((p) => p.slug));
    const scan = scanPartiesFromSources(existing);
    const added = mergeDiscoveredParties(scan.discovered);
    await syncPartiesToDb();
    lastRefreshAt = Date.now();

    const result: RefreshPartiesResult = {
      ok: true,
      added,
      total: PARTIES.length,
      sources: scan.sources,
      refreshedAt: new Date(lastRefreshAt).toISOString(),
    };

    if (added.length > 0) {
      console.info(
        `[party-scanner] +${added.length} partiti: ${added.join(", ")}`,
      );
    }

    refreshInFlight = null;
    return result;
  })();

  return refreshInFlight;
}

export function startPartyScannerSchedule(): void {
  if (intervalStarted) return;
  intervalStarted = true;

  refreshParties({ force: true }).catch((e) =>
    console.error("[party-scanner] boot refresh failed", e),
  );

  setInterval(() => {
    refreshParties({ force: true }).catch((e) =>
      console.error("[party-scanner] scheduled refresh failed", e),
    );
  }, REFRESH_INTERVAL_MS);
}

export async function ensurePartiesFresh(): Promise<PartyDefinition[]> {
  const { loadCustomPartiesIntoRegistry } = await import("@/lib/electoral/customParties");
  await refreshParties();
  await loadCustomPartiesIntoRegistry();
  return getPartiesSnapshot();
}
