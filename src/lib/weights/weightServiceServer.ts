import "server-only";

import { FACTOR_COUNT } from "./factorRegistry";
import {
  loadLatestSnapshot,
  refreshDailyFactors,
} from "./factorCollector";

const REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;

let lastRefreshAt = 0;
let refreshInFlight: Promise<{ ok: boolean; date: string }> | null = null;
let intervalStarted = false;

export async function refreshWeights(options?: { force?: boolean }): Promise<{
  ok: boolean;
  skipped?: boolean;
  date: string;
  refreshedAt: string;
}> {
  const force = options?.force ?? false;
  const now = Date.now();

  if (!force && now - lastRefreshAt < REFRESH_INTERVAL_MS) {
    const latest = await loadLatestSnapshot();
    return {
      ok: true,
      skipped: true,
      date: latest?.date ?? new Date().toISOString().slice(0, 10),
      refreshedAt: new Date(lastRefreshAt).toISOString(),
    };
  }

  if (refreshInFlight) {
    const result = await refreshInFlight;
    return {
      ok: result.ok,
      date: result.date,
      refreshedAt: new Date(lastRefreshAt).toISOString(),
    };
  }

  refreshInFlight = (async () => {
    const snapshot = await refreshDailyFactors();
    lastRefreshAt = Date.now();
    console.info(
      `[weights] refreshed ${FACTOR_COUNT} factors for ${snapshot.date}`,
    );
    refreshInFlight = null;
    return { ok: true, date: snapshot.date };
  })();

  const result = await refreshInFlight;
  return {
    ok: result.ok,
    date: result.date,
    refreshedAt: new Date(lastRefreshAt).toISOString(),
  };
}

export function startWeightsSchedule(): void {
  if (intervalStarted) return;
  intervalStarted = true;

  refreshWeights({ force: true }).catch((e) =>
    console.error("[weights] boot refresh failed", e),
  );

  setInterval(() => {
    refreshWeights({ force: true }).catch((e) =>
      console.error("[weights] scheduled refresh failed", e),
    );
  }, REFRESH_INTERVAL_MS);
}

export async function ensureWeightsFresh(): Promise<void> {
  const latest = await loadLatestSnapshot();
  if (!latest) {
    await refreshWeights({ force: true });
  }
}
