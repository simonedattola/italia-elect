import type { FactorSpec, VoteEffect, WeightCategory } from "./types";

type RawFactor = {
  name: string;
  source: string;
  format: string;
  impact: string;
  mean: number;
  std: number;
  effect: VoteEffect;
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 48);
}

function buildCategory(
  category: WeightCategory,
  prefix: string,
  factors: RawFactor[],
): FactorSpec[] {
  return factors.map((f, i) => ({
    id: `${prefix}_${slugify(f.name)}`,
    index: i + 1,
    name: f.name,
    category,
    source: f.source,
    description: f.impact,
    format: f.format,
    historicalMean: f.mean,
    historicalStdDev: f.std,
    voteEffect: f.effect,
  }));
}

const ECONOMY: RawFactor[] = [
  { name: "Inflazione IPC", source: "ISTAT", format: "% mensile", impact: "Alta inflazione penalizza il governo", mean: 2.0, std: 1.0, effect: "government_penalty" },
  { name: "Inflazione core", source: "ISTAT", format: "% mensile", impact: "Come IPC, esclude energia/alimenti", mean: 1.8, std: 0.8, effect: "government_penalty" },
  { name: "Tasso disoccupazione", source: "ISTAT", format: "% mensile", impact: "Alta disoccupazione penalizza governo", mean: 9.5, std: 2.0, effect: "government_penalty" },
  { name: "Disoccupazione giovanile", source: "ISTAT", format: "% mensile", impact: "Spinge giovani verso sinistra/M5S", mean: 28.0, std: 5.0, effect: "left_bonus" },
  { name: "PIL variazione", source: "ISTAT", format: "% trimestrale", impact: "PIL negativo penalizza governo", mean: 0.8, std: 1.2, effect: "government_penalty" },
  { name: "PIL pro-capite", source: "ISTAT", format: "€/anno", impact: "PIL basso penalizza governo", mean: 32000, std: 4000, effect: "government_penalty" },
  { name: "Spread BTP-Bund", source: "Banca d'Italia", format: "punti base", impact: "Spread alto penalizza governo", mean: 150, std: 80, effect: "government_penalty" },
  { name: "Debito pubblico PIL", source: "Banca d'Italia", format: "%", impact: "Debito >150% penalizza governo", mean: 140, std: 15, effect: "government_penalty" },
  { name: "Fiducia consumatori", source: "ISTAT", format: "indice 0-100", impact: "Bassa fiducia penalizza governo", mean: 100, std: 12, effect: "government_penalty" },
  { name: "Fiducia imprese", source: "ISTAT", format: "indice 0-100", impact: "Bassa fiducia penalizza governo", mean: 100, std: 10, effect: "government_penalty" },
  { name: "Prezzo carburante", source: "MITE", format: "€/litro", impact: "Carburante alto penalizza governo", mean: 1.75, std: 0.25, effect: "government_penalty" },
  { name: "Prezzo energia", source: "GSE", format: "€/MWh", impact: "Energia alta penalizza governo", mean: 120, std: 40, effect: "government_penalty" },
  { name: "Prezzo case", source: "ISTAT", format: "indice", impact: "Case care bonus sinistra", mean: 110, std: 15, effect: "left_bonus" },
  { name: "Costo della vita", source: "ISTAT", format: "indice", impact: "Costo alto penalizza governo", mean: 105, std: 8, effect: "government_penalty" },
  { name: "Salario medio", source: "ISTAT", format: "€/anno", impact: "Salario basso penalizza governo", mean: 28000, std: 3000, effect: "government_penalty" },
  { name: "Export Import", source: "ISTAT", format: "€ mld", impact: "Export in calo penalizza governo", mean: 50, std: 8, effect: "government_bonus" },
  { name: "Produttività lavoro", source: "ISTAT", format: "indice", impact: "Produttività in calo penalizza governo", mean: 100, std: 5, effect: "government_penalty" },
  { name: "Investimenti esteri", source: "Banca d'Italia", format: "€ mld", impact: "FDI in calo penalizza governo", mean: 25, std: 8, effect: "government_bonus" },
  { name: "Tassi BCE", source: "BCE", format: "%", impact: "Tassi alti penalizzano governo", mean: 2.0, std: 1.5, effect: "government_penalty" },
  { name: "Inflazione percepita", source: "Sondaggi", format: "%", impact: "Percepita > reale amplifica effetto", mean: 4.0, std: 2.0, effect: "government_penalty" },
];

const SECURITY: RawFactor[] = [
  { name: "Omicidi totali", source: "Min. Interno", format: "n/mese", impact: "Aumento bonus destra", mean: 45, std: 12, effect: "right_bonus" },
  { name: "Furti e rapine", source: "Min. Interno", format: "n/mese", impact: "Aumento bonus destra", mean: 12000, std: 2500, effect: "right_bonus" },
  { name: "Percezione sicurezza", source: "ISTAT", format: "% sicuri", impact: "Calo bonus destra", mean: 65, std: 10, effect: "right_bonus" },
  { name: "Immigrazione irregolare", source: "Min. Interno", format: "sbarchi", impact: "Aumento bonus destra", mean: 3500, std: 2000, effect: "right_bonus" },
  { name: "Centri accoglienza", source: "Min. Interno", format: "numero", impact: "Pieni bonus destra", mean: 70, std: 15, effect: "right_bonus" },
  { name: "Terrorismo minaccia", source: "Crisis24", format: "0-10", impact: "Alto bonus destra", mean: 3, std: 2, effect: "right_bonus" },
  { name: "Scioperi e proteste", source: "Min. Interno", format: "numero", impact: "Aumento bonus opposizione", mean: 120, std: 40, effect: "opposition_bonus" },
  { name: "Tempi processi", source: "Min. Giustizia", format: "giorni", impact: "Lunghi penalizzano governo", mean: 480, std: 80, effect: "government_penalty" },
  { name: "Carceri sovraffollamento", source: "Min. Giustizia", format: "% capienza", impact: "Alto penalizza governo", mean: 115, std: 15, effect: "government_penalty" },
  { name: "Spesa sicurezza", source: "Min. Interno", format: "€/anno", impact: "Bassa penalizza governo", mean: 12, std: 2, effect: "government_bonus" },
  { name: "Video sorveglianza", source: "Min. Interno", format: "telecamere", impact: "Bassa penalizza governo", mean: 25000, std: 5000, effect: "government_bonus" },
  { name: "Incidenti stradali", source: "ISTAT", format: "n/mese", impact: "Aumento penalizza governo", mean: 220, std: 40, effect: "government_penalty" },
  { name: "Criminalità organizzata", source: "Min. Interno", format: "arresti", impact: "Calo arresti penalizza governo", mean: 450, std: 80, effect: "government_bonus" },
  { name: "Percezione corruzione", source: "Transparency", format: "0-100", impact: "Alta penalizza governo", mean: 55, std: 10, effect: "government_penalty" },
  { name: "Fiducia polizia", source: "Sondaggi", format: "%", impact: "Bassa penalizza governo", mean: 62, std: 8, effect: "government_bonus" },
];

const HEALTH: RawFactor[] = [
  { name: "Spesa sanitaria pro-capite", source: "Min. Salute", format: "€/anno", impact: "Bassa penalizza governo", mean: 2800, std: 400, effect: "government_bonus" },
  { name: "Liste attesa media", source: "Min. Salute", format: "giorni", impact: "Lunghe penalizzano governo", mean: 65, std: 20, effect: "government_penalty" },
  { name: "Medici per 1000", source: "ISTAT", format: "numero", impact: "Basso penalizza governo", mean: 4.0, std: 0.5, effect: "government_bonus" },
  { name: "Infermieri per 1000", source: "ISTAT", format: "numero", impact: "Basso penalizza governo", mean: 6.5, std: 1.0, effect: "government_bonus" },
  { name: "Posti letto ospedalieri", source: "Min. Salute", format: "per 1000", impact: "Basso penalizza governo", mean: 3.2, std: 0.4, effect: "government_bonus" },
  { name: "Epidemie pandemie", source: "WHO ISS", format: "0-10", impact: "Attive bonus sinistra se gestite male", mean: 2, std: 2, effect: "left_bonus" },
  { name: "Aspettativa di vita", source: "ISTAT", format: "anni", impact: "Calo penalizza governo", mean: 83, std: 1.5, effect: "government_bonus" },
  { name: "Mortalità infantile", source: "ISTAT", format: "per 1000", impact: "Aumento penalizza governo", mean: 2.5, std: 0.8, effect: "government_penalty" },
  { name: "Accesso farmaci", source: "AIFA", format: "% copertura", impact: "Basso penalizza governo", mean: 85, std: 8, effect: "government_bonus" },
  { name: "Assistenza domiciliare", source: "Min. Salute", format: "% copertura", impact: "Basso penalizza governo", mean: 12, std: 4, effect: "government_bonus" },
  { name: "Salute mentale", source: "Min. Salute", format: "% popolazione", impact: "Peggiora penalizza governo", mean: 18, std: 4, effect: "government_penalty" },
  { name: "Ticket sanitari", source: "Min. Salute", format: "€ medi", impact: "Alto penalizza governo", mean: 25, std: 8, effect: "government_penalty" },
  { name: "Soddisfazione SSN", source: "Sondaggi", format: "%", impact: "Bassa penalizza governo", mean: 58, std: 10, effect: "government_bonus" },
  { name: "Spesa farmaceutica", source: "AIFA", format: "€/anno", impact: "In calo penalizza governo", mean: 450, std: 60, effect: "government_bonus" },
  { name: "Medici di famiglia", source: "Min. Salute", format: "per abitante", impact: "Basso penalizza governo", mean: 0.8, std: 0.15, effect: "government_bonus" },
];

const EDUCATION: RawFactor[] = [
  { name: "Spesa istruzione", source: "Min. Istruzione", format: "€/studente", impact: "Bassa penalizza governo", mean: 7500, std: 1200, effect: "government_bonus" },
  { name: "Tasso laureati", source: "ISTAT", format: "% pop", impact: "Basso penalizza governo", mean: 20, std: 4, effect: "government_bonus" },
  { name: "Competenze PISA", source: "OCSE", format: "punteggio", impact: "Basso penalizza governo", mean: 480, std: 30, effect: "government_bonus" },
  { name: "Accesso università", source: "MIUR", format: "% pop", impact: "Basso penalizza governo", mean: 35, std: 8, effect: "government_bonus" },
  { name: "Digitalizzazione scuole", source: "Agenda Digitale", format: "%", impact: "Lenta penalizza governo", mean: 55, std: 12, effect: "government_bonus" },
  { name: "Edilizia scolastica", source: "Min. Istruzione", format: "% sicuri", impact: "Bassa penalizza governo", mean: 72, std: 10, effect: "government_bonus" },
  { name: "Laureati STEM", source: "ISTAT", format: "%", impact: "Basso penalizza governo", mean: 18, std: 4, effect: "government_bonus" },
  { name: "Formazione professionale", source: "Min. Lavoro", format: "% copertura", impact: "Bassa penalizza governo", mean: 40, std: 10, effect: "government_bonus" },
  { name: "Spesa ricerca", source: "MIUR", format: "% PIL", impact: "Bassa penalizza governo", mean: 1.4, std: 0.3, effect: "government_bonus" },
  { name: "Spesa cultura", source: "Min. Cultura", format: "€/anno", impact: "Bassa penalizza governo", mean: 180, std: 40, effect: "government_bonus" },
];

const ENVIRONMENT: RawFactor[] = [
  { name: "Alluvioni", source: "Protezione Civile", format: "n/anno", impact: "Frequenti bonus sinistra", mean: 25, std: 12, effect: "left_bonus" },
  { name: "Terremoti", source: "INGV", format: "n/anno", impact: "Frequenti bonus sinistra", mean: 8, std: 4, effect: "left_bonus" },
  { name: "Qualità aria", source: "ARPA", format: "PM10", impact: "Scarsa bonus sinistra", mean: 35, std: 12, effect: "left_bonus" },
  { name: "Gestione rifiuti", source: "Min. Ambiente", format: "% differenziata", impact: "Bassa penalizza governo", mean: 58, std: 10, effect: "government_bonus" },
  { name: "Energie rinnovabili", source: "GSE", format: "% produzione", impact: "Bassa penalizza governo", mean: 38, std: 8, effect: "government_bonus" },
  { name: "Consumo suolo", source: "ISPRA", format: "%", impact: "Alto penalizza governo", mean: 7, std: 2, effect: "government_penalty" },
  { name: "Temperatura anomala", source: "ARPA", format: "°C", impact: "Estrema bonus sinistra", mean: 1.2, std: 0.8, effect: "left_bonus" },
  { name: "Siccità", source: "Protezione Civile", format: "livello", impact: "Alta bonus sinistra", mean: 4, std: 2, effect: "left_bonus" },
  { name: "Inquinamento idrico", source: "ARPA", format: "% potabili", impact: "Scarsa penalizza governo", mean: 88, std: 8, effect: "government_bonus" },
  { name: "Verde pubblico", source: "ISTAT", format: "m²/abitante", impact: "Basso penalizza governo", mean: 45, std: 12, effect: "government_bonus" },
];

const GEOPOLITICS: RawFactor[] = [
  { name: "Conflitti attivi", source: "Crisis24", format: "numero", impact: "Attivi bonus destra", mean: 12, std: 5, effect: "right_bonus" },
  { name: "Crisi migratoria", source: "Min. Interno", format: "0-10", impact: "Alta bonus destra", mean: 5, std: 2, effect: "right_bonus" },
  { name: "Tensione UE", source: "DGAP", format: "0-10", impact: "Alta bonus destra", mean: 4, std: 2, effect: "right_bonus" },
  { name: "Tensione Russia", source: "DGAP", format: "0-10", impact: "Alta bonus destra", mean: 6, std: 2, effect: "right_bonus" },
  { name: "Tensione Cina", source: "DGAP", format: "0-10", impact: "Alta bonus destra", mean: 4, std: 2, effect: "right_bonus" },
  { name: "Accordi commerciali", source: "Min. Esteri", format: "numero", impact: "Buoni bonus governo", mean: 8, std: 3, effect: "government_bonus" },
  { name: "Presenza militare estero", source: "Min. Difesa", format: "numero", impact: "Alta bonus governo", mean: 6, std: 2, effect: "government_bonus" },
  { name: "Rapporti USA", source: "Min. Esteri", format: "0-10", impact: "Buoni bonus governo", mean: 7, std: 2, effect: "government_bonus" },
  { name: "Visti immigrazione legale", source: "Min. Interno", format: "numero", impact: "Aumento bonus sinistra", mean: 450000, std: 80000, effect: "left_bonus" },
  { name: "Spese NATO", source: "Min. Difesa", format: "% PIL", impact: "Rispettate bonus governo", mean: 1.5, std: 0.3, effect: "government_bonus" },
];

const POLITICS: RawFactor[] = [
  { name: "Fiducia governo", source: "Sondaggi", format: "%", impact: "Bassa penalizza governo", mean: 35, std: 12, effect: "government_bonus" },
  { name: "Fiducia parlamento", source: "Sondaggi", format: "%", impact: "Bassa penalizza governo", mean: 28, std: 10, effect: "government_penalty" },
  { name: "Fiducia presidente", source: "Sondaggi", format: "%", impact: "Bassa penalizza governo", mean: 55, std: 12, effect: "neutral" },
  { name: "Corruzione percepita", source: "Transparency", format: "0-100", impact: "Alta penalizza governo", mean: 55, std: 10, effect: "government_penalty" },
  { name: "Leggi approvate", source: "Parlamento", format: "n/anno", impact: "Poche penalizzano governo", mean: 120, std: 30, effect: "government_bonus" },
  { name: "Riforme giustizia", source: "Parlamento", format: "numero", impact: "Bloccate penalizzano governo", mean: 2, std: 1, effect: "government_bonus" },
  { name: "Riforme lavoro", source: "Parlamento", format: "numero", impact: "Bloccate penalizzano governo", mean: 2, std: 1, effect: "government_bonus" },
  { name: "Riforme pensioni", source: "Parlamento", format: "numero", impact: "Bloccate penalizzano governo", mean: 1, std: 1, effect: "government_bonus" },
  { name: "Riforme sanità", source: "Parlamento", format: "numero", impact: "Bloccate penalizzano governo", mean: 2, std: 1, effect: "government_bonus" },
  { name: "Stabilità coalizione", source: "Sondaggi", format: "%", impact: "Instabile penalizza governo", mean: 55, std: 15, effect: "government_bonus" },
  { name: "Visibilità opposizione", source: "Sondaggi", format: "%", impact: "Alta bonus opposizione", mean: 40, std: 12, effect: "opposition_bonus" },
  { name: "Popolarità leader", source: "Sondaggi", format: "%", impact: "Alta bonus governo", mean: 42, std: 15, effect: "government_bonus" },
  { name: "Disapprovazione leader", source: "Sondaggi", format: "%", impact: "Alta penalizza governo", mean: 48, std: 15, effect: "government_penalty" },
  { name: "Scandali ministri", source: "Notizie", format: "n/anno", impact: "Alti penalizzano governo", mean: 4, std: 3, effect: "government_penalty" },
  { name: "Sostegno UE", source: "Sondaggi", format: "%", impact: "Basso bonus destra", mean: 58, std: 10, effect: "right_bonus" },
];

const TAXES: RawFactor[] = [
  { name: "Pressione fiscale", source: "Banca d'Italia", format: "% PIL", impact: "Alta penalizza governo", mean: 42, std: 4, effect: "government_penalty" },
  { name: "IRPEF aliquota media", source: "Agenzia Entrate", format: "%", impact: "Alta penalizza governo", mean: 28, std: 4, effect: "government_penalty" },
  { name: "IRES aliquota", source: "Agenzia Entrate", format: "%", impact: "Alta penalizza imprese/governo", mean: 24, std: 3, effect: "government_penalty" },
  { name: "IVA aliquota", source: "Agenzia Entrate", format: "%", impact: "Alta penalizza governo", mean: 22, std: 2, effect: "government_penalty" },
  { name: "Flat tax riduzione", source: "Leggi", format: "%", impact: "Attuata bonus governo", mean: 15, std: 8, effect: "government_bonus" },
  { name: "Evasione fiscale", source: "Agenzia Entrate", format: "€ mld", impact: "Alta penalizza governo", mean: 90, std: 15, effect: "government_penalty" },
  { name: "Tassa successione", source: "Agenzia Entrate", format: "%", impact: "Alta penalizza governo", mean: 8, std: 3, effect: "government_penalty" },
  { name: "Tassa immobiliare", source: "Agenzia Entrate", format: "%", impact: "Alta penalizza governo", mean: 0.8, std: 0.3, effect: "government_penalty" },
  { name: "Tassa turismo", source: "Agenzia Entrate", format: "€/giorno", impact: "Alta penalizza governo", mean: 3, std: 1.5, effect: "government_penalty" },
  { name: "Tassa extraprofitti", source: "Leggi", format: "%", impact: "Attuata bonus sinistra", mean: 25, std: 15, effect: "left_bonus" },
];

const WEATHER: RawFactor[] = [
  { name: "Temperatura anomala meteo", source: "ARPA", format: "°C", impact: "Estrema bonus sinistra", mean: 1.0, std: 0.8, effect: "left_bonus" },
  { name: "Giornate sole", source: "ARPA", format: "n/mese", impact: "Molte migliorano umore governo", mean: 18, std: 5, effect: "government_bonus" },
  { name: "Giornate pioggia", source: "ARPA", format: "n/mese", impact: "Molte penalizzano governo", mean: 8, std: 4, effect: "government_penalty" },
  { name: "Alluvioni meteo", source: "Protezione Civile", format: "n/anno", impact: "Frequenti bonus sinistra", mean: 20, std: 10, effect: "left_bonus" },
  { name: "Siccità meteo", source: "Protezione Civile", format: "0-10", impact: "Alta bonus sinistra", mean: 4, std: 2, effect: "left_bonus" },
  { name: "Neve", source: "ARPA", format: "cm", impact: "Eccesso penalizza governo", mean: 25, std: 20, effect: "government_penalty" },
  { name: "Uragani", source: "ARPA", format: "n/anno", impact: "Frequenti bonus sinistra", mean: 1, std: 1, effect: "left_bonus" },
  { name: "Ondate calore", source: "ARPA", format: "n/anno", impact: "Frequenti bonus sinistra", mean: 8, std: 4, effect: "left_bonus" },
  { name: "Smog", source: "ARPA", format: "PM10", impact: "Alto bonus sinistra", mean: 40, std: 12, effect: "left_bonus" },
  { name: "Polline", source: "ARPA", format: "livello", impact: "Alto penalizza governo", mean: 5, std: 2, effect: "government_penalty" },
];

const SPORTS: RawFactor[] = [
  { name: "Vittoria Italia calcio", source: "FIGC", format: "risultato", impact: "Vittoria bonus governo", mean: 0.5, std: 0.3, effect: "government_bonus" },
  { name: "Sconfitta Italia calcio", source: "FIGC", format: "risultato", impact: "Sconfitta penalizza governo", mean: 0.3, std: 0.3, effect: "government_penalty" },
  { name: "Medaglie Olimpiadi", source: "CONI", format: "numero", impact: "Vittorie bonus governo", mean: 25, std: 10, effect: "government_bonus" },
  { name: "Vittoria mondiale", source: "FIGC", format: "risultato", impact: "Vittoria forte bonus governo", mean: 0.05, std: 0.05, effect: "government_bonus" },
  { name: "Vittoria europeo", source: "UEFA", format: "risultato", impact: "Vittoria bonus governo", mean: 0.1, std: 0.08, effect: "government_bonus" },
  { name: "Champions italiane", source: "UEFA", format: "risultato", impact: "Vittoria bonus governo", mean: 0.15, std: 0.1, effect: "government_bonus" },
  { name: "Sport invernali", source: "FISI", format: "medaglie", impact: "Vittorie bonus governo", mean: 8, std: 4, effect: "government_bonus" },
  { name: "Tennis Sinner", source: "ATP", format: "vittorie", impact: "Vittorie bonus governo", mean: 45, std: 15, effect: "government_bonus" },
  { name: "Motori MotoGP F1", source: "FIM FIA", format: "vittorie", impact: "Vittorie bonus governo", mean: 8, std: 4, effect: "government_bonus" },
  { name: "Evento sportivo nazionale", source: "CONI", format: "numero", impact: "Orgoglio bonus governo", mean: 3, std: 2, effect: "government_bonus" },
];

const SOCIAL_NEWS: RawFactor[] = [
  { name: "Volume conversazioni", source: "Twitter", format: "volume/giorno", impact: "Alto polarizza", mean: 50000, std: 20000, effect: "polarizing" },
  { name: "Sentiment social", source: "Twitter", format: "-100..+100", impact: "Negativo penalizza governo", mean: 0, std: 25, effect: "government_penalty" },
  { name: "Trending politici", source: "Twitter", format: "lista", impact: "Temi caldi spostano voto", mean: 5, std: 3, effect: "polarizing" },
  { name: "Fake news", source: "FactCheckers", format: "numero", impact: "Diffuse polarizzano", mean: 12, std: 6, effect: "polarizing" },
  { name: "Interazioni post", source: "Social", format: "numero", impact: "Influenzano indecisi", mean: 250000, std: 80000, effect: "polarizing" },
  { name: "Hashtag politici", source: "Twitter", format: "volume", impact: "Alto polarizza", mean: 15000, std: 8000, effect: "polarizing" },
  { name: "Copertura mediatica", source: "RSS", format: "min/giorno", impact: "Alta amplifica temi", mean: 45, std: 15, effect: "polarizing" },
  { name: "Tono notizie", source: "RSS", format: "-100..+100", impact: "Negativo penalizza governo", mean: -5, std: 20, effect: "government_penalty" },
  { name: "Influencer politici", source: "Social", format: "numero", impact: "Spostano giovani", mean: 25, std: 10, effect: "left_bonus" },
  { name: "Movimento sondaggi", source: "Istituti", format: "%", impact: "Bandwagon effect", mean: 2, std: 3, effect: "polarizing" },
];

const DEMOGRAPHY: RawFactor[] = [
  { name: "Età elettori", source: "ISTAT", format: "% fascia", impact: "Giovani sinistra", mean: 45, std: 8, effect: "left_bonus" },
  { name: "Reddito medio", source: "ISTAT", format: "€/anno", impact: "Alto destra", mean: 28000, std: 5000, effect: "right_bonus" },
  { name: "Istruzione media", source: "ISTAT", format: "% laureati", impact: "Alta sinistra", mean: 20, std: 5, effect: "left_bonus" },
  { name: "Zona urbano rurale", source: "ISTAT", format: "%", impact: "Urbano sinistra rurale destra", mean: 55, std: 10, effect: "polarizing" },
  { name: "Religiosità", source: "ISTAT", format: "% praticanti", impact: "Alta destra", mean: 28, std: 8, effect: "right_bonus" },
  { name: "Genere", source: "ISTAT", format: "% M/F", impact: "Donne sinistra", mean: 52, std: 3, effect: "left_bonus" },
  { name: "Occupazione settore", source: "ISTAT", format: "% settore", impact: "Operai sinistra imprenditori destra", mean: 50, std: 12, effect: "polarizing" },
  { name: "Umore collettivo", source: "Sondaggi", format: "-100..+100", impact: "Negativo penalizza governo", mean: -5, std: 20, effect: "government_penalty" },
  { name: "Ottimismo pessimismo", source: "Sondaggi", format: "%", impact: "Pessimismo penalizza governo", mean: 45, std: 12, effect: "government_penalty" },
  { name: "Indice felicità", source: "ISTAT", format: "0-10", impact: "Basso penalizza governo", mean: 6.5, std: 1.0, effect: "government_bonus" },
];

export const FACTOR_SPECS: FactorSpec[] = [
  ...buildCategory("economy", "economy", ECONOMY),
  ...buildCategory("security", "security", SECURITY),
  ...buildCategory("health", "health", HEALTH),
  ...buildCategory("education", "education", EDUCATION),
  ...buildCategory("environment", "environment", ENVIRONMENT),
  ...buildCategory("geopolitics", "geopolitics", GEOPOLITICS),
  ...buildCategory("politics", "politics", POLITICS),
  ...buildCategory("taxes", "taxes", TAXES),
  ...buildCategory("weather", "weather", WEATHER),
  ...buildCategory("sports", "sports", SPORTS),
  ...buildCategory("social_news", "social_news", SOCIAL_NEWS),
  ...buildCategory("demography", "demography", DEMOGRAPHY),
].map((f, globalIndex) => ({ ...f, index: globalIndex + 1 }));

export const FACTOR_COUNT = FACTOR_SPECS.length;
