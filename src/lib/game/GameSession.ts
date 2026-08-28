import { nanoid } from "nanoid";
import type { GamePlayer, GameSessionState, GameSimulationOptions } from "./types";

const sessions = new Map<string, GameSessionState>();

export class GameSession {
  static create(mode: GameSimulationOptions["mode"], options: Partial<GameSimulationOptions> = {}): GameSessionState {
    const session: GameSessionState = {
      id: nanoid(12),
      mode,
      players: [],
      options: {
        mode,
        redistributionMode: "candidates_only",
        ...options,
      },
      createdAt: new Date().toISOString(),
    };
    sessions.set(session.id, session);
    return session;
  }

  static get(id: string): GameSessionState | undefined {
    return sessions.get(id);
  }

  static update(id: string, patch: Partial<GameSessionState>): GameSessionState | undefined {
    const s = sessions.get(id);
    if (!s) return undefined;
    const next = { ...s, ...patch, options: { ...s.options, ...patch.options } };
    sessions.set(id, next);
    return next;
  }

  static addPlayer(sessionId: string, player: GamePlayer): GameSessionState | undefined {
    const s = sessions.get(sessionId);
    if (!s || s.players.length >= 4) return undefined;
    const next = { ...s, players: [...s.players, player] };
    sessions.set(sessionId, next);
    return next;
  }
}
