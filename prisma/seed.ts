import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { PARTIES } from "../src/lib/electoral/parties";
import { REGIONS, PROVINCES } from "../src/lib/electoral/provinces";
import { HISTORICAL_NATIONAL, AREA_BIAS, PROVINCE_BIAS } from "../src/lib/electoral/historical";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding Italia Elect…");

  await prisma.electionResult.deleteMany();
  await prisma.territorialMetrics.deleteMany();
  await prisma.dataUpdateLog.deleteMany();
  await prisma.simulation.deleteMany();
  await prisma.candidate.deleteMany();
  await prisma.comparison.deleteMany();
  await prisma.election.deleteMany();
  await prisma.province.deleteMany();
  await prisma.region.deleteMany();
  await prisma.party.deleteMany();

  for (const p of PARTIES) {
    await prisma.party.create({
      data: {
        slug: p.slug,
        name: p.name,
        shortName: p.shortName,
        color: p.color,
        ideology: p.ideology,
        ideologyScore: p.ideologyScore,
        coalitionFamily: p.coalitionFamily,
        foundedYear: p.foundedYear,
      },
    });
  }
  console.log(`  ✓ ${PARTIES.length} partiti`);

  const regionMap = new Map<string, string>();
  for (const r of REGIONS) {
    const row = await prisma.region.create({ data: { code: r.code, name: r.name } });
    regionMap.set(r.code, row.id);
  }
  console.log(`  ✓ ${REGIONS.length} regioni`);

  for (const p of PROVINCES) {
    await prisma.province.create({
      data: {
        code: p.code,
        name: p.name,
        regionId: regionMap.get(p.regionCode)!,
        lat: p.lat,
        lng: p.lng,
        population: p.population,
      },
    });
  }
  console.log(`  ✓ ${PROVINCES.length} province`);

  const parties = await prisma.party.findMany();
  const partyBySlug = new Map(parties.map((p) => [p.slug, p.id]));
  const provinces = await prisma.province.findMany();
  const provinceByCode = new Map(provinces.map((p) => [p.code, p]));

  for (const snap of HISTORICAL_NATIONAL) {
    const election = await prisma.election.create({
      data: {
        type: snap.type,
        year: snap.year,
        date: new Date(`${snap.year}-06-01`),
        name: `${snap.type === "POLITICHE" ? "Politiche" : "Europee"} ${snap.year}`,
        turnout: snap.turnout,
        source: snap.source,
        sourceUrl: snap.sourceUrl,
      },
    });

    const nationalRows = [];
    const provincialRows = [];

    for (const [slug, percentage] of Object.entries(snap.shares)) {
      const partyId = partyBySlug.get(slug);
      if (!partyId || percentage <= 0) continue;

      const votes = Math.round((percentage / 100) * 30_000_000 * (snap.turnout / 100));
      nationalRows.push({
        electionId: election.id,
        partyId,
        scope: "NAZIONALE" as const,
        votes,
        percentage,
        turnout: snap.turnout,
      });

      for (const prov of PROVINCES) {
        const areaBias = AREA_BIAS[prov.area]?.[slug] ?? 1;
        const pb = PROVINCE_BIAS[prov.code]?.[slug] ?? 1;
        const localPct = Math.round(percentage * areaBias * pb * 10) / 10;
        const province = provinceByCode.get(prov.code)!;
        const localVotes = Math.round(
          (localPct / 100) * (prov.population * 0.7) * (snap.turnout / 100)
        );
        provincialRows.push({
          electionId: election.id,
          partyId,
          scope: "PROVINCIALE" as const,
          provinceId: province.id,
          votes: localVotes,
          percentage: Math.min(localPct, 85),
          turnout: snap.turnout,
        });
      }
    }

    await prisma.electionResult.createMany({ data: nationalRows });
    // Batch provinciali
    const chunk = 500;
    for (let i = 0; i < provincialRows.length; i += chunk) {
      await prisma.electionResult.createMany({ data: provincialRows.slice(i, i + chunk) });
    }

    await prisma.dataUpdateLog.create({
      data: {
        source: snap.source,
        sourceUrl: snap.sourceUrl,
        electionType: snap.type,
        year: snap.year,
        recordsAdded: nationalRows.length + provincialRows.length,
        status: "ok",
        message: `Seed storico ${snap.type} ${snap.year}`,
      },
    });
  }
  console.log(`  ✓ ${HISTORICAL_NATIONAL.length} elezioni storiche`);

  const metrics = [];
  for (const prov of provinces) {
    const def = PROVINCES.find((p) => p.code === prov.code)!;
    for (const party of parties) {
      const bias =
        (AREA_BIAS[def.area]?.[party.slug] ?? 1) *
        (PROVINCE_BIAS[def.code]?.[party.slug] ?? 1);
      metrics.push({
        provinceId: prov.id,
        partyId: party.id,
        loyalty: Math.min(0.95, 0.4 + bias * 0.25),
        volatility: Math.max(0.1, 0.45 - bias * 0.1),
        abstentionTrend: 0.35,
        growthRate: (bias - 1) * 0.15,
        avgTurnout: 62,
      });
    }
  }
  await prisma.territorialMetrics.createMany({ data: metrics });
  console.log("  ✓ metriche territoriali");

  // Contesto dinamico
  const { EMBEDDED_POLLS } = await import("../src/lib/intelligence/polls");
  const { EMBEDDED_EVENTS } = await import("../src/lib/intelligence/newsAnalysis");
  const { EMBEDDED_ECONOMY } = await import("../src/lib/intelligence/economicModel");
  const { CURATED_PUBLIC_FIGURES, normalizePersonKey } = await import(
    "../src/lib/intelligence/publicFigure/knowledgeBase"
  );
  const { identifyPublicFigureSync } = await import(
    "../src/lib/intelligence/publicFigure/engine"
  );
  const { writeFigureCache } = await import(
    "../src/lib/intelligence/publicFigure/cache"
  );

  await prisma.poll.deleteMany();
  await prisma.politicalEvent.deleteMany();
  await prisma.economicSnapshot.deleteMany();
  await prisma.candidateProfileCache.deleteMany();

  for (const p of EMBEDDED_POLLS) {
    await prisma.poll.create({
      data: {
        institute: p.institute,
        publishedAt: new Date(p.publishedAt),
        sampleSize: p.sampleSize,
        methodology: p.methodology,
        reliability: p.reliability ?? 0.7,
        shares: p.shares,
        leaderTrust: p.leaderTrust ?? undefined,
        sourceUrl: p.sourceUrl,
      },
    });
  }
  console.log(`  ✓ ${EMBEDDED_POLLS.length} sondaggi`);

  for (const e of EMBEDDED_EVENTS) {
    await prisma.politicalEvent.create({
      data: {
        title: e.title,
        summary: e.summary,
        occurredAt: new Date(e.occurredAt),
        sourceType: e.sourceType,
        sourceUrl: e.sourceUrl,
        intensity: e.intensity,
        durationDays: e.durationDays,
        favoredParties: e.favoredParties,
        penalizedParties: e.penalizedParties,
        electorateShare: e.electorateShare,
        themes: e.themes,
      },
    });
  }
  console.log(`  ✓ ${EMBEDDED_EVENTS.length} eventi politici`);

  await prisma.economicSnapshot.create({
    data: {
      asOf: new Date(EMBEDDED_ECONOMY.asOf),
      gdpGrowth: EMBEDDED_ECONOMY.gdpGrowth,
      inflation: EMBEDDED_ECONOMY.inflation,
      unemployment: EMBEDDED_ECONOMY.unemployment,
      realWageGrowth: EMBEDDED_ECONOMY.realWageGrowth,
      costOfLivingIndex: EMBEDDED_ECONOMY.costOfLivingIndex,
      spreadBtpBund: EMBEDDED_ECONOMY.spreadBtpBund,
      consumerConfidence: EMBEDDED_ECONOMY.consumerConfidence,
      source: EMBEDDED_ECONOMY.source ?? "ISTAT",
      sourceUrl: EMBEDDED_ECONOMY.sourceUrl,
    },
  });
  console.log("  ✓ snapshot economico");

  for (const k of CURATED_PUBLIC_FIGURES) {
    const figure = identifyPublicFigureSync(k.firstName, k.lastName);
    await writeFigureCache(figure);
    await prisma.candidateProfileCache.create({
      data: {
        firstName: k.firstName,
        lastName: k.lastName,
        normalizedKey: normalizePersonKey(k.firstName, k.lastName),
        category: k.category,
        biography: k.biography,
        career: k.politicalHistory.join("; "),
        sources: JSON.parse(JSON.stringify(k.sources)),
        notoriety: k.publicRecognition,
        mediaExposure: k.mediaExposure,
        perceivedLeadership: k.inferredScores?.leadership ?? 50,
        electoralImpact: {
          newVotes: figure.personalBrandScore * 0.7,
          lostVotes: 30,
          mobilizeAbstainers: k.inferredScores?.mobilization ?? 40,
          communication: k.inferredScores?.communication ?? 50,
        },
        controversyNotes: JSON.parse(JSON.stringify(k.controversies)),
        profileScores: JSON.parse(JSON.stringify(k.inferredScores ?? {})),
        reliability: k.category === "NATIONAL_PUBLIC" ? 0.92 : 0.7,
        identifiers: JSON.parse(
          JSON.stringify({
            wikidataId: k.wikidataId,
            personalBrandScore: figure.personalBrandScore,
          })
        ),
      },
    });
  }
  console.log(`  ✓ ${CURATED_PUBLIC_FIGURES.length} profili pubblici in cache`);

  console.log("✅ Seed completato.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
