import {
  PLATFORM_HOURS,
  PLATFORM_USAGE_PCT,
  ageToBand,
} from "./agcomMatrix";
import type {
  AgentSocialProfile,
  AgentWeights,
  EmotionalState,
} from "./types";

export const DEFAULT_AGENT_WEIGHTS: AgentWeights = {
  economy: 0.3,
  security: 0.15,
  health: 0.1,
  education: 0.05,
  environment: 0.05,
  geopolitics: 0.05,
  politics: 0.1,
  taxes: 0.05,
  weather: 0.02,
  sports: 0.02,
  social: 0.05,
  news: 0.05,
  personal: 0.06,
};

export function buildDefaultEmotionalState(rng: () => number): EmotionalState {
  return {
    mood: (rng() - 0.5) * 0.8,
    anxiety: rng() * 0.5,
    optimism: (rng() - 0.4) * 0.6,
    anger: rng() * 0.4,
  };
}

export function buildSocialProfile(
  age: number,
  rng: () => number,
  opts?: { followsMeloni?: boolean; followsPd?: boolean },
): AgentSocialProfile {
  const band = ageToBand(age);
  const usage = PLATFORM_USAGE_PCT[band] ?? PLATFORM_USAGE_PCT["35-44"]!;
  const hours = PLATFORM_HOURS[band] ?? PLATFORM_HOURS["35-44"]!;

  const active = (platform: string, pct: number) => rng() * 100 < pct;

  const followers = () => Math.floor(50 + rng() * 2000);

  return {
    x: {
      active: active("x", usage.x ?? 0),
      hoursPerDay: hours.x ?? 0,
      followers: followers(),
    },
    facebook: {
      active: active("facebook", usage.facebook ?? 0),
      hoursPerDay: hours.facebook ?? 0,
      followers: followers(),
    },
    instagram: {
      active: active("instagram", usage.instagram ?? 0),
      hoursPerDay: hours.instagram ?? 0,
      followers: followers(),
    },
    tiktok: {
      active: active("tiktok", usage.tiktok ?? 0),
      hoursPerDay: hours.tiktok ?? 0,
      followers: followers(),
    },
    reddit: {
      active: active("reddit", usage.reddit ?? 0),
      hoursPerDay: hours.reddit ?? 0,
      followers: followers(),
    },
    followsMeloni: opts?.followsMeloni ?? false,
    followsPd: opts?.followsPd ?? false,
  };
}

export function normalizeWeights(w: AgentWeights): AgentWeights {
  const sum = Object.values(w).reduce((a, b) => a + b, 0) || 1;
  const out = { ...w };
  for (const k of Object.keys(out) as (keyof AgentWeights)[]) {
    out[k] = out[k]! / sum;
  }
  return out;
}
