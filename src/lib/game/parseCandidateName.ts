/**
 * Parsing intelligente nome candidato — supporta cognome solo (es. "Meloni").
 */
import { findCuratedBySurname, findCuratedFigure } from "@/lib/intelligence/publicFigure/knowledgeBase";

export interface ParsedCandidateName {
  firstName: string;
  lastName: string;
  matchedFromSurname?: boolean;
}

export function parseCandidateName(full: string): ParsedCandidateName {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };

  if (parts.length === 1) {
    const token = parts[0]!;
    const bySurname = findCuratedBySurname(token);
    if (bySurname) {
      return {
        firstName: bySurname.firstName,
        lastName: bySurname.lastName,
        matchedFromSurname: true,
      };
    }
    return { firstName: token, lastName: token };
  }

  const firstName = parts[0]!;
  const lastName = parts.slice(1).join(" ");

  if (parts.length === 2 && firstName.toLowerCase() === lastName.toLowerCase()) {
    const bySurname = findCuratedBySurname(firstName);
    if (bySurname) {
      return {
        firstName: bySurname.firstName,
        lastName: bySurname.lastName,
        matchedFromSurname: true,
      };
    }
  }

  const curated = findCuratedFigure(firstName, lastName);
  if (curated) {
    return { firstName: curated.firstName, lastName: curated.lastName };
  }
  return { firstName, lastName };
}
