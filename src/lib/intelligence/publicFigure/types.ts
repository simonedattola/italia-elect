/**
 * Public Figure Profile — Entity Resolution + Candidate Knowledge Retrieval.
 * Solo informazioni documentabili; niente invenzioni.
 */

export type FigureIdentityKind =
  | "politician"
  | "former_politician"
  | "institutional"
  | "entrepreneur"
  | "media_figure"
  | "other_public"
  | "unknown";

/** Categoria semantica richiesta dal modello CandidateProfile esteso */
export type RoleCategory =
  | "politician"
  | "entrepreneur"
  | "media"
  | "local_public_figure"
  | "other"
  | "unknown";

export type ScopeCategory = "NATIONAL_PUBLIC" | "LOCAL_PUBLIC" | "UNKNOWN";

export type RecognitionMethod =
  | "knowledge_base"
  | "wikidata"
  | "wikipedia"
  | "dbpedia"
  | "institutional"
  | "llm_synthesis"
  | "entity_resolution"
  | "cache"
  | "none";

export interface PublicFigureSource {
  title: string;
  url?: string;
  type:
    | "wikidata"
    | "wikipedia"
    | "dbpedia"
    | "istituzionale"
    | "partito"
    | "giornalistico"
    | "knowledge_base"
    | "llm";
}

/** Candidato entity resolution (omonimi) */
export interface EntityCandidate {
  wikidataId?: string;
  label: string;
  description: string;
  confidence: number;
  wikipediaUrl?: string;
  roleCategory: RoleCategory;
}

export interface PublicFigureProfile {
  name: string;
  canonicalName: string;
  firstName: string;
  lastName: string;
  normalizedKey: string;
  /** true solo se riconosciuto come figura pubblica utilizzabile nel modello */
  publicFigure: boolean;
  /** 0–100: confidenza entity resolution */
  confidence: number;
  identity: FigureIdentityKind;
  /** Scope legacy (nazionale / locale / sconosciuto) */
  category: ScopeCategory;
  /** Categoria semantica (politician | entrepreneur | …) */
  roleCategory: RoleCategory;
  biography: string;
  politicalHistory: string[];
  positions: string[];
  partyHistory: string[];
  associatedParties: string[];
  occupations: string[];
  importantDates: string[];
  mediaExposure: number;
  publicRecognition: number;
  notorietyScore: number;
  mediaExposureScore: number;
  polarizationScore: number;
  controversies: {
    verifiedFacts: string[];
    proceedings: string[];
    finalConvictions: string[];
    accusations: string[];
    publicOpinions: string[];
  };
  sources: PublicFigureSource[];
  wikidataId?: string;
  wikipediaUrl?: string;
  dbpediaUri?: string;
  defaultPartySlug?: string;
  ideologyHint?: number;
  inferredScores?: {
    credibility: number;
    experience: number;
    competence: number;
    leadership: number;
    communication: number;
    popularity: number;
    scandalRisk: number;
    mediaConsensus: number;
    socialConsensus: number;
    undecidedAppeal: number;
    mobilization: number;
    trust: number;
    polarization: number;
    personalLoyalty: number;
  };
  personalBrandScore: number;
  lastUpdated: string;
  fromCache: boolean;
  recognitionMethod: RecognitionMethod;
  insufficientData: boolean;
  /** Confidenza < 70 → non auto-assegnare */
  needsConfirmation: boolean;
  confirmationPrompt?: string;
  candidateOptions?: EntityCandidate[];
  message: string;
}

export interface PersonalBrandBreakdown {
  score: number;
  notoriety: number;
  trust: number;
  communication: number;
  personalLoyalty: number;
  polarization: number;
  label: "molto_basso" | "basso" | "medio" | "alto" | "molto_alto";
}

export interface IdentifyContext {
  skipRemote?: boolean;
  partySlug?: string;
  description?: string;
  program?: string;
  /** Se l'utente conferma un omonimo */
  confirmedWikidataId?: string;
  /** Soglia auto-assegnazione (default 70) */
  confidenceThreshold?: number;
}

/** Soglia minima per assegnazione automatica */
export const CONFIDENCE_AUTO_THRESHOLD = 70;
