/**
 * Seggi del territorio nazionale dopo la l. cost. 1/2020 e il d.lgs. 177/2020.
 * Fonte dei numeri: dossier Camera AC0445b (censimento 2011) —
 * https://documenti.camera.it/leg18/dossier/testi/AC0445b.htm
 * La circoscrizione Estero (8 deputati, 4 senatori) non è inclusa:
 * i microdati Italia non la contengono.
 */

export interface CameraCircoscrizione {
  id: string;
  name: string;
  region: string;
  total: number;
  uninominal: number;
  proportional: number;
}

export interface SenateRegionSeats {
  region: string;
  total: number;
  uninominal: number;
  proportional: number;
}

export const CAMERA_DOMESTIC = 392;
export const CAMERA_UNINOMINAL = 147;
export const CAMERA_PROPORTIONAL = 245;
export const CAMERA_OVERSEAS = 8;
export const CAMERA_FULL = 400;

export const SENATE_DOMESTIC = 196;
export const SENATE_UNINOMINAL = 74;
export const SENATE_PROPORTIONAL = 122;
export const SENATE_OVERSEAS = 4;
export const SENATE_FULL = 200;

/** Soglie Rosatellum (l. 165/2017): 3% lista, 10% coalizione, 1% per il trasferimento interno. */
export const LIST_THRESHOLD = 0.03;
export const COALITION_THRESHOLD = 0.1;
export const TRANSFER_FLOOR = 0.01;
/** Deroga regionale (Senato, e minoranze) usata quando il chiamante la passa esplicitamente. */
export const REGIONAL_ESCAPE = 0.2;

export const EUROPEAN_SEATS_ITALY_2024 = 76;
export const EUROPEAN_THRESHOLD = 0.04;

export const CAMERA_CIRCOSCRIZIONI: CameraCircoscrizione[] = [
  { id: "piemonte-1", name: "Piemonte 1", region: "Piemonte", total: 15, uninominal: 5, proportional: 10 },
  { id: "piemonte-2", name: "Piemonte 2", region: "Piemonte", total: 14, uninominal: 5, proportional: 9 },
  { id: "valle-d-aosta", name: "Valle d'Aosta", region: "Valle d'Aosta", total: 1, uninominal: 1, proportional: 0 },
  { id: "lombardia-1", name: "Lombardia 1", region: "Lombardia", total: 25, uninominal: 9, proportional: 16 },
  { id: "lombardia-2", name: "Lombardia 2", region: "Lombardia", total: 14, uninominal: 5, proportional: 9 },
  { id: "lombardia-3", name: "Lombardia 3", region: "Lombardia", total: 14, uninominal: 5, proportional: 9 },
  { id: "lombardia-4", name: "Lombardia 4", region: "Lombardia", total: 11, uninominal: 4, proportional: 7 },
  { id: "trentino-alto-adige", name: "Trentino-Alto Adige", region: "Trentino-Alto Adige", total: 7, uninominal: 4, proportional: 3 },
  { id: "veneto-1", name: "Veneto 1", region: "Veneto", total: 13, uninominal: 5, proportional: 8 },
  { id: "veneto-2", name: "Veneto 2", region: "Veneto", total: 19, uninominal: 7, proportional: 12 },
  { id: "friuli-venezia-giulia", name: "Friuli-Venezia Giulia", region: "Friuli-Venezia Giulia", total: 8, uninominal: 3, proportional: 5 },
  { id: "liguria", name: "Liguria", region: "Liguria", total: 10, uninominal: 4, proportional: 6 },
  { id: "emilia-romagna", name: "Emilia-Romagna", region: "Emilia-Romagna", total: 29, uninominal: 11, proportional: 18 },
  { id: "toscana", name: "Toscana", region: "Toscana", total: 24, uninominal: 9, proportional: 15 },
  { id: "umbria", name: "Umbria", region: "Umbria", total: 6, uninominal: 2, proportional: 4 },
  { id: "marche", name: "Marche", region: "Marche", total: 10, uninominal: 4, proportional: 6 },
  { id: "lazio-1", name: "Lazio 1", region: "Lazio", total: 24, uninominal: 9, proportional: 15 },
  { id: "lazio-2", name: "Lazio 2", region: "Lazio", total: 12, uninominal: 5, proportional: 7 },
  { id: "abruzzo", name: "Abruzzo", region: "Abruzzo", total: 9, uninominal: 3, proportional: 6 },
  { id: "molise", name: "Molise", region: "Molise", total: 2, uninominal: 1, proportional: 1 },
  { id: "campania-1", name: "Campania 1", region: "Campania", total: 20, uninominal: 7, proportional: 13 },
  { id: "campania-2", name: "Campania 2", region: "Campania", total: 18, uninominal: 7, proportional: 11 },
  { id: "puglia", name: "Puglia", region: "Puglia", total: 27, uninominal: 10, proportional: 17 },
  { id: "basilicata", name: "Basilicata", region: "Basilicata", total: 4, uninominal: 1, proportional: 3 },
  { id: "calabria", name: "Calabria", region: "Calabria", total: 13, uninominal: 5, proportional: 8 },
  { id: "sicilia-1", name: "Sicilia 1", region: "Sicilia", total: 15, uninominal: 6, proportional: 9 },
  { id: "sicilia-2", name: "Sicilia 2", region: "Sicilia", total: 17, uninominal: 6, proportional: 11 },
  { id: "sardegna", name: "Sardegna", region: "Sardegna", total: 11, uninominal: 4, proportional: 7 },
];

export const SENATE_REGIONS: SenateRegionSeats[] = [
  { region: "Piemonte", total: 14, uninominal: 5, proportional: 9 },
  { region: "Valle d'Aosta", total: 1, uninominal: 1, proportional: 0 },
  { region: "Lombardia", total: 31, uninominal: 11, proportional: 20 },
  { region: "Trentino-Alto Adige", total: 6, uninominal: 6, proportional: 0 },
  { region: "Veneto", total: 16, uninominal: 5, proportional: 11 },
  { region: "Friuli-Venezia Giulia", total: 4, uninominal: 1, proportional: 3 },
  { region: "Liguria", total: 5, uninominal: 2, proportional: 3 },
  { region: "Emilia-Romagna", total: 14, uninominal: 5, proportional: 9 },
  { region: "Toscana", total: 12, uninominal: 4, proportional: 8 },
  { region: "Umbria", total: 3, uninominal: 1, proportional: 2 },
  { region: "Marche", total: 5, uninominal: 2, proportional: 3 },
  { region: "Lazio", total: 18, uninominal: 6, proportional: 12 },
  { region: "Abruzzo", total: 4, uninominal: 1, proportional: 3 },
  { region: "Molise", total: 2, uninominal: 1, proportional: 1 },
  { region: "Campania", total: 18, uninominal: 7, proportional: 11 },
  { region: "Puglia", total: 13, uninominal: 5, proportional: 8 },
  { region: "Basilicata", total: 3, uninominal: 1, proportional: 2 },
  { region: "Calabria", total: 6, uninominal: 2, proportional: 4 },
  { region: "Sicilia", total: 16, uninominal: 6, proportional: 10 },
  { region: "Sardegna", total: 5, uninominal: 2, proportional: 3 },
];

export function majorityOf(totalSeats: number): number {
  return Math.floor(totalSeats / 2) + 1;
}
