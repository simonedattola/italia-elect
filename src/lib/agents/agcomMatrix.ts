/** Griglia AGCOM 2024 — utilizzo piattaforme per fascia d'età (%). */
export const PLATFORM_USAGE_PCT: Record<
  string,
  Record<string, number>
> = {
  "18-24": { x: 25, facebook: 40, instagram: 70, tiktok: 60, reddit: 15, none: 5 },
  "25-34": { x: 35, facebook: 50, instagram: 65, tiktok: 45, reddit: 20, none: 8 },
  "35-44": { x: 20, facebook: 55, instagram: 50, tiktok: 25, reddit: 10, none: 15 },
  "45-54": { x: 10, facebook: 60, instagram: 35, tiktok: 10, reddit: 5, none: 25 },
  "55-64": { x: 5, facebook: 55, instagram: 20, tiktok: 3, reddit: 2, none: 40 },
  "65+": { x: 1, facebook: 30, instagram: 8, tiktok: 0, reddit: 0, none: 70 },
};

/** Ore medie giornaliere per piattaforma. */
export const PLATFORM_HOURS: Record<string, Record<string, number>> = {
  "18-24": { x: 1.5, facebook: 1.0, instagram: 2.5, tiktok: 2.0, reddit: 0.5 },
  "25-34": { x: 1.0, facebook: 1.5, instagram: 2.0, tiktok: 1.0, reddit: 0.8 },
  "35-44": { x: 0.5, facebook: 2.0, instagram: 1.0, tiktok: 0.3, reddit: 0.3 },
  "45-54": { x: 0.3, facebook: 1.5, instagram: 0.5, tiktok: 0.1, reddit: 0.1 },
  "55-64": { x: 0.1, facebook: 1.0, instagram: 0.2, tiktok: 0.0, reddit: 0.0 },
  "65+": { x: 0.05, facebook: 0.5, instagram: 0.05, tiktok: 0.0, reddit: 0.0 },
};

export function ageToBand(age: number): string {
  if (age <= 24) return "18-24";
  if (age <= 34) return "25-34";
  if (age <= 44) return "35-44";
  if (age <= 54) return "45-54";
  if (age <= 64) return "55-64";
  return "65+";
}
