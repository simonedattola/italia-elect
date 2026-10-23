import { clamp } from "@/lib/utils";
import { AUTHORITARIAN_NOTE, FIGURES, SCELBA_NOTE, TOTALITARIAN_NOTE, type PublicFigure } from "./catalog";
import { completeJson } from "@/lib/ai/gateway";

export interface LeaderAssessment {
  matched: boolean;
  source: "catalog" | "llm" | "unknown";
  figureId?: string;
  displayName: string;
  alive: boolean;
  ideology: number;
  notoriety: number;
  /** Vicinanza allo schema della lista, 0–100. Non è il risultato elettorale. */
  coherence: number;
  /** Numero che entra nel modello. Per i vincoli costituzionali resta basso anche se la coerenza è alta. */
  compatibility: number;
  swing: number;
  cap?: number;
  backlash?: number;
  deceased: boolean;
  legalNote?: string;
  explanation: string;
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function findFigure(name: string): PublicFigure | null {
  const key = normalize(name);
  if (!key || key.length < 3) return null;
  const exact = FIGURES.find((figure) => normalize(figure.name) === key || figure.aliases.some((alias) => normalize(alias) === key));
  if (exact) return exact;
  const hits = FIGURES.filter((figure) => {
    const last = normalize(figure.name).split(" ").slice(-1)[0] ?? "";
    return key === last || figure.aliases.some((alias) => key === normalize(alias));
  });
  return hits.length === 1 ? hits[0]! : null;
}

function coherenceOf(figure: PublicFigure, partyIdeology: number, partyId: string): number {
  if (figure.naturalParties.includes(partyId)) return 92;
  const distance = Math.abs(figure.ideology - partyIdeology);
  return clamp(Math.round(100 - distance * 78), 4, 96);
}

function explain(figure: PublicFigure, partyId: string, coherence: number): { compatibility: number; swing: number; cap?: number; backlash?: number; legalNote?: string; explanation: string } {
  if (figure.constraint !== "none") {
    const legalNote =
      figure.constraint === "fascist-reorganization"
        ? SCELBA_NOTE
        : figure.constraint === "authoritarian-foreign"
          ? AUTHORITARIAN_NOTE
          : TOTALITARIAN_NOTE;
    const cap = figure.constraint === "authoritarian-foreign" ? 2.2 : 1.4;
    return {
      compatibility: 8,
      swing: -16,
      cap,
      backlash: 6,
      legalNote,
      explanation: `${figure.name} è riconosciuto nell'archivio curato. ${figure.record} La vicinanza sullo schema sinistra-destra con la lista scelta è ${coherence}/100, ma il risultato elettorale non la segue: ${figure.alive ? "resta una figura esterna alla competizione italiana" : "non è in vita e non può condurre una campagna"}, il posizionamento estremo costa consensi e mobilita gli avversari. Il modello mette un tetto al ${cap.toFixed(1).replace(".", ",")}% e sposta parte dell'attenzione verso le altre liste.`,
    };
  }
  const natural = figure.naturalParties.includes(partyId);
  const compatibility = natural ? Math.max(coherence, 80) : coherence;
  let swing = ((compatibility - 58) / 42) * 2.4 * (figure.notoriety / 100);
  if (!figure.alive) swing -= 1.4;
  if (!natural && figure.notoriety >= 85 && compatibility < 45) {
    swing += 0.4;
  }
  swing = clamp(swing, -6, 2.5);
  const mismatch = !natural && coherence < 55;
  const explanation = mismatch
    ? `${figure.name} è riconosciuto. ${figure.record} Coerenza con la lista: ${coherence}/100. Lo scarto ideologico toglie elettori vicini alla lista e la notorietà (${figure.notoriety}/100) può attirarne altri, in misura minore. ${figure.alive ? "" : `È morto nel ${figure.died}: il modello applica una penalità perché non può condurre la campagna.`} Spostamento dello schema: ${swing > 0 ? "+" : ""}${swing.toFixed(1)} punti.`
    : `${figure.name} è riconosciuto. ${figure.record} Coerenza con la lista: ${coherence}/100. La notorietà (${figure.notoriety}/100) ${natural ? "è coerente con il ruolo nella lista" : "resta esterna ai partiti italiani"} e sposta la quota di ${swing > 0 ? "+" : ""}${swing.toFixed(1)} punti prima dell'incertezza.`;
  return { compatibility, swing, explanation: explanation.replace(/\s+/g, " ").trim() };
}

export function assessLeader(name: string, partyId: string, partyIdeology = 0): LeaderAssessment {
  const figure = findFigure(name);
  if (!figure) {
    return {
      matched: false,
      source: "unknown",
      displayName: name.trim(),
      alive: true,
      ideology: partyIdeology,
      notoriety: 15,
      coherence: 50,
      compatibility: 50,
      swing: 0,
      deceased: false,
      explanation: "Nome non presente nell'archivio curato. Resta un candidato descritto da chi gioca, senza effetto da figura pubblica.",
    };
  }
  const coherence = coherenceOf(figure, partyIdeology, partyId);
  const effect = explain(figure, partyId, coherence);
  return {
    matched: true,
    source: "catalog",
    figureId: figure.id,
    displayName: figure.name,
    alive: figure.alive,
    ideology: figure.ideology,
    notoriety: figure.notoriety,
    coherence,
    deceased: !figure.alive,
    ...effect,
  };
}

export async function assessLeaderWithFallback(name: string, partyId: string, partyIdeology = 0): Promise<LeaderAssessment> {
  const local = assessLeader(name, partyId, partyIdeology);
  if (local.matched) return local;
  const raw = await completeJson(
    "Rispondi solo con JSON: {\"known\": boolean, \"name\": string, \"alive\": boolean, \"ideology\": number fra -1 e 1, \"notoriety\": number fra 0 e 100}. ideology è uno schema sinistra-destra. Se il nome non è una persona pubblica, known=false. Non scrivere biografie né slogan.",
    name.slice(0, 120),
  );
  if (!raw) return local;
  try {
    const parsed = JSON.parse(raw) as { known?: boolean; name?: string; alive?: boolean; ideology?: number; notoriety?: number };
    if (!parsed.known || typeof parsed.ideology !== "number") return local;
    const ideology = clamp(parsed.ideology, -1, 1);
    const notoriety = clamp(typeof parsed.notoriety === "number" ? parsed.notoriety : 40, 0, 100);
    const distance = Math.abs(ideology - partyIdeology);
    const coherence = clamp(Math.round(100 - distance * 78), 4, 96);
    const extreme = Math.abs(ideology) >= 0.92;
    const swing = extreme ? -8 : clamp(((coherence - 58) / 42) * 2 * (notoriety / 100), -4, 2);
    return {
      matched: true,
      source: "llm",
      displayName: typeof parsed.name === "string" && parsed.name.trim() ? parsed.name.trim().slice(0, 80) : name.trim(),
      alive: parsed.alive !== false,
      ideology,
      notoriety,
      coherence,
      compatibility: extreme ? 12 : coherence,
      swing,
      cap: extreme ? 3 : undefined,
      backlash: extreme ? 4 : undefined,
      deceased: parsed.alive === false,
      explanation: extreme
        ? "Il nome non è nell'archivio curato. La lettura automatica lo colloca agli estremi dello schema: il modello applica un tetto e una reazione delle altre liste. La lettura è incerta e non sostituisce una fonte."
        : `Il nome non è nell'archivio curato. Lettura automatica: coerenza ${coherence}/100, notorietà ${Math.round(notoriety)}. È uno scenario incerto, non una scheda biografica.`,
    };
  } catch {
    return local;
  }
}
