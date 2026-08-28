/**
 * Baseline semplificata per il gioco — usa sondaggi incorporati senza stack realtime.
 */
import { aggregatePolls, EMBEDDED_POLLS } from "@/lib/intelligence/polls";

export function getGameBaseline(): Record<string, number> {
  return { ...aggregatePolls(EMBEDDED_POLLS).shares };
}

export function getGamePollShares(): Record<string, number> {
  return getGameBaseline();
}
