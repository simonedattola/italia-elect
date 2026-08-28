import { PARTIES_BY_IDEOLOGY } from "./modeConfig";
import {
  ideologyFromCustomProfile,
  partyColorFromIdeology,
} from "./themeQuestions";
import type { GamePlayer, PlayerFormState } from "./types";

export function emptyPlayerForm(id: string): PlayerFormState {
  return {
    id,
    displayName: "",
    leaderFirstName: "",
    leaderLastName: "",
    description: "",
    program: "",
    vpFirstName: "",
    vpLastName: "",
    partySlug: "",
    customPartyName: "",
    customMotto: "",
    economicAxis: 0,
    socialAxis: 0,
    themeAnswers: {},
  };
}

export function formToGamePlayer(form: PlayerFormState): GamePlayer | null {
  if (!form.displayName.trim()) return null;
  if (!form.leaderFirstName.trim() || !form.leaderLastName.trim()) return null;
  if (!form.partySlug) return null;

  const isCustom = form.partySlug === "custom";
  let party;

  if (isCustom) {
    if (!form.customPartyName.trim()) return null;
    const { ideologyScore } = ideologyFromCustomProfile(
      form.economicAxis,
      form.socialAxis,
      form.themeAnswers,
    );
    party = {
      slug: `custom-${form.id}`,
      name: form.customPartyName.trim(),
      color: partyColorFromIdeology(ideologyScore),
      isCustom: true,
      ideologyScore,
      customProfile: {
        motto: form.customMotto.trim(),
        economicAxis: form.economicAxis,
        socialAxis: form.socialAxis,
        themeAnswers: form.themeAnswers,
      },
    };
  } else {
    const p = PARTIES_BY_IDEOLOGY.find((x) => x.slug === form.partySlug);
    if (!p) return null;
    party = {
      slug: p.slug,
      name: p.name,
      color: p.color,
      ideologyScore: p.ideologyScore,
    };
  }

  const player: GamePlayer = {
    id: form.id,
    displayName: form.displayName.trim(),
    party,
    candidate: {
      firstName: form.leaderFirstName.trim(),
      lastName: form.leaderLastName.trim(),
      description: form.description.trim() || undefined,
      program: form.program.trim() || undefined,
    },
    isHuman: true,
  };

  if (form.vpFirstName.trim() && form.vpLastName.trim()) {
    player.vicePresident = {
      firstName: form.vpFirstName.trim(),
      lastName: form.vpLastName.trim(),
    };
  }

  return player;
}

export function validatePlayerForm(form: PlayerFormState): string[] {
  const errors: string[] = [];
  if (!form.displayName.trim()) errors.push("Nome giocatore");
  if (!form.leaderFirstName.trim() || !form.leaderLastName.trim()) errors.push("Leader");
  if (!form.partySlug) errors.push("Partito");
  if (form.partySlug === "custom" && !form.customPartyName.trim()) errors.push("Nome partito custom");
  return errors;
}
