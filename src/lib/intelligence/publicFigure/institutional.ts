/**
 * Fonti istituzionali leggere — derivate da incarichi Wikidata (P39)
 * e link noti governo/parlamento quando applicabili.
 */

import type { PublicFigureSource } from "./types";

const KNOWN_POSITIONS: Record<string, { label: string; source?: PublicFigureSource }> = {
  Q796897: {
    label: "Presidente del Consiglio dei Ministri",
    source: {
      title: "Governo italiano — Presidenti del Consiglio",
      url: "https://www.governo.it/",
      type: "istituzionale",
    },
  },
  Q191616: {
    label: "Presidente della Repubblica Italiana",
    source: {
      title: "Presidenza della Repubblica",
      url: "https://www.quirinale.it/",
      type: "istituzionale",
    },
  },
  Q276277: {
    label: "Senatore della Repubblica Italiana",
    source: {
      title: "Senato della Repubblica",
      url: "https://www.senato.it/",
      type: "istituzionale",
    },
  },
  Q27169: {
    label: "Deputato della Repubblica Italiana",
    source: {
      title: "Camera dei deputati",
      url: "https://www.camera.it/",
      type: "istituzionale",
    },
  },
  Q4175034: {
    label: "Europarlamentare",
    source: {
      title: "Parlamento europeo",
      url: "https://www.europarl.europa.eu/",
      type: "istituzionale",
    },
  },
  Q271694: {
    label: "Sindaco",
    source: { title: "Anagrafe amministratori / enti locali", type: "istituzionale" },
  },
  Q140686: {
    label: "Ministro della Repubblica Italiana",
    source: {
      title: "Governo italiano",
      url: "https://www.governo.it/",
      type: "istituzionale",
    },
  },
};

export function resolveInstitutionalPositions(positionIds: string[]): {
  positions: string[];
  sources: PublicFigureSource[];
} {
  const positions: string[] = [];
  const sources: PublicFigureSource[] = [];
  const seen = new Set<string>();

  for (const id of positionIds) {
    const known = KNOWN_POSITIONS[id];
    if (!known || seen.has(known.label)) continue;
    seen.add(known.label);
    positions.push(known.label);
    if (known.source && !sources.some((s) => s.title === known.source!.title)) {
      sources.push(known.source);
    }
  }

  return { positions, sources };
}
