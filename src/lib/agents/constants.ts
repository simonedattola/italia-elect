/** Popolazione elettorale virtuale del modello (clonazione digitale Italia). */
export const VIRTUAL_POPULATION = 60_000_000;

export const DEFAULT_AGENT_SAMPLE_SIZE = Number(
  process.env.AGENT_SAMPLE_SIZE ?? 5_000,
);

export const ITALIAN_REGIONS = [
  "Abruzzo",
  "Basilicata",
  "Calabria",
  "Campania",
  "Emilia-Romagna",
  "Friuli-Venezia Giulia",
  "Lazio",
  "Liguria",
  "Lombardia",
  "Marche",
  "Molise",
  "Piemonte",
  "Puglia",
  "Sardegna",
  "Sicilia",
  "Toscana",
  "Trentino-Alto Adige",
  "Umbria",
  "Valle d'Aosta",
  "Veneto",
] as const;

export type ItalianRegion = (typeof ITALIAN_REGIONS)[number];

export const INCOME_DECILES = [
  "d1",
  "d2",
  "d3",
  "d4",
  "d5",
  "d6",
  "d7",
  "d8",
  "d9",
  "d10",
] as const;

export const EDUCATION_LEVELS = ["bassa", "media", "alta"] as const;
export const ZONE_TYPES = ["urbano", "suburbano", "rurale"] as const;
export const PLATFORMS = ["x", "facebook", "instagram", "tiktok", "reddit", "none"] as const;
