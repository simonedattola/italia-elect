export interface SharePayload {
  v: 1;
  level: "nazionali" | "europee" | "regionali" | "comunali";
  baselineId: string;
  seed: number;
  runs: number;
  sigma: number;
  pollWeight: number;
  usePolls: boolean;
  factors: { economy: number; security: number; europe: number; costOfLiving: number; social?: number };
  coalitions: Record<string, string | null>;
  affinity?: { listId: string; score: number; notoriety: number };
  customParty?: {
    name: string;
    color: string;
    target: number;
    ideology: number;
    description?: string;
    candidates?: string;
  };
  region?: string;
  comuneId?: string;
  councilSeats?: number;
  regionalBonusSeats?: number;
  bonusCoalitionId?: string | null;
  scenarios?: import("@/lib/scenarios/types").ScenarioInput[];
  leader?: {
    name: string;
    listId: string;
    swing?: number;
    cap?: number;
    backlash?: number;
    note?: string;
    legalNote?: string;
    explanation?: string;
  };
  commonShockSd?: number;
  collegioNoiseSd?: number;
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  const b64 = btoa(bin);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  const b64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  const bin = atob(b64 + pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export function encodeShare(payload: SharePayload): string {
  return toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
}

export function decodeShare(value: string): SharePayload | null {
  try {
    const json = new TextDecoder().decode(fromBase64Url(value));
    const parsed = JSON.parse(json) as SharePayload;
    if (parsed?.v !== 1 || !parsed.level || !parsed.baselineId) return null;
    return parsed;
  } catch {
    return null;
  }
}
