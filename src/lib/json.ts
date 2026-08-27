import type { Prisma } from "@prisma/client";
import type {
  CandidateProfile,
  CoalitionResult,
  ModelMeta,
  PartyResult,
  ProvinceResult,
  SeatAllocation,
} from "@/types/simulation";

type Json = Prisma.JsonValue;

export function asPartyResults(value: Json): PartyResult[] {
  return value as unknown as PartyResult[];
}

export function asProvinceResults(value: Json): ProvinceResult[] {
  return value as unknown as ProvinceResult[];
}

export function asSeatAllocation(value: Json): SeatAllocation {
  return value as unknown as SeatAllocation;
}

export function asCoalitions(value: Json): CoalitionResult[] {
  return value as unknown as CoalitionResult[];
}

export function asModelMeta(value: Json): ModelMeta {
  return value as unknown as ModelMeta;
}

export function asCandidateProfile(value: Json | null): CandidateProfile | null {
  if (value == null) return null;
  return value as unknown as CandidateProfile;
}

export function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
