/**
 * Cache file-system per profili pubblici riconosciuti.
 * Path: candidate-cache/<slug>.json
 */

import { promises as fs } from "fs";
import path from "path";
import type { PublicFigureProfile } from "./types";
import { normalizePersonKey } from "./knowledgeBase";

const CACHE_DIR = path.join(process.cwd(), "candidate-cache");
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 giorni

function cacheSlug(firstName: string, lastName: string): string {
  return normalizePersonKey(firstName, lastName)
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export function cachePath(firstName: string, lastName: string): string {
  return path.join(CACHE_DIR, `${cacheSlug(firstName, lastName)}.json`);
}

export async function readFigureCache(
  firstName: string,
  lastName: string
): Promise<PublicFigureProfile | null> {
  try {
    const file = cachePath(firstName, lastName);
    const raw = await fs.readFile(file, "utf8");
    const data = JSON.parse(raw) as PublicFigureProfile;
    const age = Date.now() - new Date(data.lastUpdated).getTime();
    if (Number.isFinite(age) && age < MAX_AGE_MS) {
      return { ...data, fromCache: true, recognitionMethod: "cache" };
    }
    return null;
  } catch {
    return null;
  }
}

export async function writeFigureCache(profile: PublicFigureProfile): Promise<void> {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    const file = cachePath(profile.firstName, profile.lastName);
    const toStore = {
      ...profile,
      fromCache: false,
      lastUpdated: new Date().toISOString(),
    };
    await fs.writeFile(file, JSON.stringify(toStore, null, 2), "utf8");
  } catch (e) {
    console.warn("[candidate-cache] write failed", e);
  }
}
