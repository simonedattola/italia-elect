"use server";

import { z } from "zod";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { getParty } from "@/lib/electoral/parties";
import { asProvinceResults, asPartyResults, toJson } from "@/lib/json";

const schema = z.object({
  slugs: z.array(z.string()).min(2).max(6),
});

export async function createComparison(slugs: string[]) {
  const parsed = schema.safeParse({ slugs });
  if (!parsed.success) {
    return { ok: false as const, error: "Seleziona da 2 a 6 simulazioni" };
  }

  const sims = await prisma.simulation.findMany({
    where: { slug: { in: parsed.data.slugs } },
    include: { candidate: true },
  });

  if (sims.length < 2) {
    return { ok: false as const, error: "Simulazioni non trovate" };
  }

  const candidates = sims.map((s) => {
    const national = asPartyResults(s.nationalResults);
    const map = asProvinceResults(s.provincialMap);
    const partyShare =
      national.find((r) => r.partySlug === s.candidate.partySlug)?.percentage ?? 0;
    const seatsChamber =
      national.find((r) => r.partySlug === s.candidate.partySlug)?.seatsChamber ?? 0;
    return {
      id: s.id,
      slug: s.slug,
      name: `${s.candidate.firstName} ${s.candidate.lastName}`,
      partySlug: s.candidate.partySlug,
      partyName: getParty(s.candidate.partySlug)?.shortName ?? s.candidate.partySlug,
      color: getParty(s.candidate.partySlug)?.color ?? "#666",
      winProbability: s.winProbability,
      nationalShare: partyShare,
      seatsChamber,
      provincesWon: map.filter((p) => p.winnerSlug === s.candidate.partySlug).length,
    };
  });

  candidates.sort((a, b) => b.winProbability - a.winProbability);
  const winner = candidates[0];

  const allCodes = new Set<string>();
  const maps = sims.map((s) => ({
    id: s.id,
    map: asProvinceResults(s.provincialMap),
  }));
  for (const m of maps) for (const p of m.map) allCodes.add(p.provinceCode);

  const provinceDiffs = [...allCodes].map((code) => {
    const winners: Record<string, string> = {};
    for (const m of maps) {
      const row = m.map.find((p) => p.provinceCode === code);
      if (row) winners[m.id] = row.winnerSlug;
    }
    return { provinceCode: code, winners };
  });

  const contested = provinceDiffs.filter((d) => {
    const vals = Object.values(d.winners);
    return new Set(vals).size > 1;
  }).length;

  const analysis =
    `Nel confronto tra ${candidates.length} candidati, **${winner.name}** (${winner.partyName}) ` +
    `risulta favorito con probabilità di vittoria del **${winner.winProbability}%** e quota nazionale **${winner.nationalShare}%**. ` +
    `Province conquistate dal proprio partito: ${winner.provincesWon}. ` +
    `Province con esito divergente tra scenari: ${contested}. ` +
    `Questo confronto aggrega simulazioni indipendenti; non costituisce una previsione congiunta.`;

  const slug = nanoid(10);
  const comparison = await prisma.comparison.create({
    data: {
      slug,
      simulationIds: sims.map((s) => s.id),
      winnerId: winner.id,
      results: toJson({ candidates, provinceDiffs, contested }),
      analysis,
    },
  });

  return { ok: true as const, slug: comparison.slug };
}

export async function getComparison(slug: string) {
  const row = await prisma.comparison.findUnique({ where: { slug } });
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    createdAt: row.createdAt.toISOString(),
    winnerId: row.winnerId,
    results: row.results as unknown as {
      candidates: {
        id: string;
        slug: string;
        name: string;
        partySlug: string;
        partyName: string;
        color: string;
        winProbability: number;
        nationalShare: number;
        seatsChamber?: number;
        provincesWon: number;
      }[];
      provinceDiffs: { provinceCode: string; winners: Record<string, string> }[];
      contested: number;
    },
    analysis: row.analysis,
  };
}
