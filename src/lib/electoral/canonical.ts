/** Nomi canonici delle regioni, allineati alla mappa e ai microdati. */
export const REGION_NAMES = [
  "Piemonte",
  "Valle d'Aosta",
  "Lombardia",
  "Trentino-Alto Adige",
  "Veneto",
  "Friuli-Venezia Giulia",
  "Liguria",
  "Emilia-Romagna",
  "Toscana",
  "Umbria",
  "Marche",
  "Lazio",
  "Abruzzo",
  "Molise",
  "Campania",
  "Puglia",
  "Basilicata",
  "Calabria",
  "Sicilia",
  "Sardegna",
] as const;

export type RegionName = (typeof REGION_NAMES)[number];

const REGION_LOOKUP: Record<string, RegionName> = {
  PIEMONTE: "Piemonte",
  "VALLE D'AOSTA": "Valle d'Aosta",
  "VALLE D'AOSTA/VALLEE D'AOSTE": "Valle d'Aosta",
  "VALLE D AOSTA": "Valle d'Aosta",
  LOMBARDIA: "Lombardia",
  "TRENTINO-ALTO ADIGE": "Trentino-Alto Adige",
  "TRENTINO-ALTO ADIGE/SUDTIROL": "Trentino-Alto Adige",
  "TRENTINO ALTO ADIGE": "Trentino-Alto Adige",
  "TRENTINO ALTO ADIGE SUDTIROL": "Trentino-Alto Adige",
  VENETO: "Veneto",
  "FRIULI-VENEZIA GIULIA": "Friuli-Venezia Giulia",
  "FRIULI VENEZIA GIULIA": "Friuli-Venezia Giulia",
  LIGURIA: "Liguria",
  "EMILIA-ROMAGNA": "Emilia-Romagna",
  "EMILIA ROMAGNA": "Emilia-Romagna",
  TOSCANA: "Toscana",
  UMBRIA: "Umbria",
  MARCHE: "Marche",
  LAZIO: "Lazio",
  ABRUZZO: "Abruzzo",
  MOLISE: "Molise",
  CAMPANIA: "Campania",
  PUGLIA: "Puglia",
  BASILICATA: "Basilicata",
  CALABRIA: "Calabria",
  SICILIA: "Sicilia",
  SARDEGNA: "Sardegna",
};

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 96);
}

/** Circoscrizione Eligendo ("PIEMONTE 1", "LOMBARDIA") → regione. */
export function regionFromLabel(label: string): RegionName | null {
  const cleaned = label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+\d+$/, "")
    .replace(/[^A-Z' ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return REGION_LOOKUP[cleaned] ?? null;
}

/**
 * Identificativo stabile per il modello e i sondaggi.
 * L'archivio conserva invece il nome ufficiale, senza accorpamenti.
 */
export function canonicalListId(officialName: string): string {
  const n = officialName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  if (n.includes("FRATELLI")) return "fratelli-ditalia";
  if (n.includes("LEGA")) return "lega";
  if (n.includes("FORZA ITALIA")) return "forza-italia";
  if (n.includes("NOI MODERATI")) return "noi-moderati";
  if (n.includes("PARTITO DEMOCRATICO")) return "partito-democratico";
  if (n.includes("5 STELLE")) return "movimento-5-stelle";
  if (n.includes("VERDI E SINISTRA")) return "avss";
  if (n.includes("FUTURO NAZIONALE")) return "futuro-nazionale";
  if (n.includes("ITALIA VIVA") && !n.includes("AZIONE")) return "italia-viva";
  if (n.includes("AZIONE") && !n.includes("ITALIA VIVA")) return "azione";
  if (n.includes("AZIONE")) return "azione-iv";
  if (n.includes("+EUROPA") || n.startsWith("+ EUROPA")) return "piu-europa";
  if (n.includes("ITALEXIT")) return "italexit";
  if (n.includes("IMPEGNO CIVICO")) return "impegno-civico";
  if (n.includes("SUD CHIAMA NORD")) return "sud-chiama-nord";
  if (n.includes("UNIONE POPOLARE")) return "unione-popolare";
  if (n.includes("ITALIA SOVRANA")) return "italia-sovrana-e-popolare";
  if (n.includes("SVP") || n.includes("SUDTIROLER")) return "svp";
  if (n.includes("#NAME?")) return "lista-nome-corrotto";
  return slugify(officialName) || "lista";
}

/** Colori convenzionali di lettura, non stemmi ufficiali. */
const COLORS: Record<string, string> = {
  "fratelli-ditalia": "#003399",
  lega: "#1F8F4E",
  "forza-italia": "#0087DC",
  "noi-moderati": "#6FA8DC",
  "partito-democratico": "#E31C2B",
  "movimento-5-stelle": "#E0B400",
  avss: "#5FAF3A",
  azione: "#F07A1A",
  "italia-viva": "#C71585",
  "futuro-nazionale": "#1A5276",
  "azione-iv": "#E85D04",
  "piu-europa": "#F2C200",
  italexit: "#6B7280",
  "impegno-civico": "#0F766E",
  "sud-chiama-nord": "#B45309",
  "unione-popolare": "#9F1239",
  "italia-sovrana-e-popolare": "#7C3AED",
  svp: "#111827",
};

export function colorForList(id: string): string {
  if (COLORS[id]) return COLORS[id];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 33 + id.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `hsl(${hue} 42% 36%)`;
}

/** Posizione sinistra-destra usata solo come elasticità di scenario, da -1 a +1. */
const IDEOLOGY: Record<string, number> = {
  "unione-popolare": -0.85,
  avss: -0.7,
  "partito-democratico": -0.35,
  "piu-europa": -0.05,
  azione: 0.12,
  "italia-viva": 0.05,
  "futuro-nazionale": 0.78,
  "sud-chiama-nord": 0.28,
  "azione-iv": 0.05,
  "movimento-5-stelle": -0.05,
  "impegno-civico": -0.15,
  "forza-italia": 0.35,
  "noi-moderati": 0.3,
  lega: 0.62,
  "fratelli-ditalia": 0.72,
  "italia-sovrana-e-popolare": 0.8,
  italexit: 0.84,
  svp: 0.15,
};

export function ideologyForList(id: string): number {
  return IDEOLOGY[id] ?? 0;
}
