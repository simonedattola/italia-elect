/**
 * Loader sondaggi storici (Fase 1: dataset strutturato, valori illustrativi).
 */

import { promises as fs } from "fs";
import path from "path";
import type { NormalizedPoll } from "./types";

const POLLS_FILE = path.join(process.cwd(), "src/data/polls/polls.json");

export interface PollsFile {
  version: string;
  note: string;
  polls: NormalizedPoll[];
}

export async function loadPolls(): Promise<NormalizedPoll[]> {
  const raw = JSON.parse(await fs.readFile(POLLS_FILE, "utf8")) as PollsFile;
  return raw.polls ?? [];
}

export async function getPollsNear(
  dateIso: string,
  windowDays = 45
): Promise<NormalizedPoll[]> {
  const target = new Date(dateIso).getTime();
  const windowMs = windowDays * 24 * 3600 * 1000;
  const polls = await loadPolls();
  return polls.filter((p) => {
    const t = new Date(p.publishedAt).getTime();
    return Math.abs(t - target) <= windowMs;
  });
}

export { POLLS_FILE };
