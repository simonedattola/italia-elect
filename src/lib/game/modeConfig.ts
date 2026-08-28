import { PARTIES } from "@/lib/electoral/parties";
import type { GameDifficulty, GameMode } from "./types";

export type ModeSlug = "multiplayer" | "vscomputer" | "livelli";

export interface ModeConfig {
  slug: ModeSlug;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  gameMode: GameMode;
  minPlayers: number;
  maxPlayers: number;
  showDifficulty?: boolean;
  defaultDifficulty?: GameDifficulty;
}

export const MODE_CONFIGS: Record<ModeSlug, ModeConfig> = {
  multiplayer: {
    slug: "multiplayer",
    title: "Multiplayer",
    subtitle: "2–8 giocatori",
    description:
      "Ogni giocatore crea candidato e partito (o ne sceglie uno reale). Configurate lo scenario, poi simulate le elezioni nazionali con mappa e statistiche.",
    icon: "👥",
    gameMode: "multiplayer",
    minPlayers: 2,
    maxPlayers: 8,
  },
  vscomputer: {
    slug: "vscomputer",
    title: "Solo vs Computer",
    subtitle: "1 giocatore",
    description:
      "Affronta un avversario IA con profilo e strategia propri. Scegli scenario e se competere solo tra i partiti in gara o con tutti i partiti reali.",
    icon: "🤖",
    gameMode: "vscomputer",
    minPlayers: 1,
    maxPlayers: 1,
    showDifficulty: true,
    defaultDifficulty: "medium",
  },
  livelli: {
    slug: "livelli",
    title: "Livelli",
    subtitle: "Campagna progressiva",
    description:
      "Modalità solitaria con difficoltà crescente. Parti da uno scenario favorevole e affronta crisi sempre più complesse per scalare la classifica.",
    icon: "🏆",
    gameMode: "singleplayer",
    minPlayers: 1,
    maxPlayers: 1,
    showDifficulty: true,
    defaultDifficulty: "easy",
  },
};

export function getModeConfig(slug: string): ModeConfig | null {
  return MODE_CONFIGS[slug as ModeSlug] ?? null;
}

export const PARTIES_BY_IDEOLOGY = [...PARTIES].sort(
  (a, b) => a.ideologyScore - b.ideologyScore,
);
