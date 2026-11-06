/**
 * Baseline semplificata per il gioco — usa sondaggi incorporati senza stack realtime.
 */
import { currentPollAggregate } from "@/lib/model/currentScenario";

export function getGameBaseline(): Record<string, number> {
  return { ...currentPollAggregate().shares };
}

export function getGamePollShares(): Record<string, number> {
  return getGameBaseline();
}
