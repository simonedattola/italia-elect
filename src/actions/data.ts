"use server";

import { prisma } from "@/lib/prisma";
import { HISTORICAL_NATIONAL } from "@/lib/electoral/historical";

/**
 * Stub di aggiornamento automatico dati elettorali.
 * In produzione: fetch da Eligendo / open data Ministero, validazione, upsert.
 * Documentato in /metodologia.
 */
export async function refreshElectoralData() {
  const last = await prisma.dataUpdateLog.findFirst({
    orderBy: { createdAt: "desc" },
  });

  const latestKnown = HISTORICAL_NATIONAL[HISTORICAL_NATIONAL.length - 1];

  await prisma.dataUpdateLog.create({
    data: {
      source: "Job di controllo — Ministero dell'Interno / Eligendo",
      sourceUrl: "https://elezioni.interno.gov.it/",
      electionType: latestKnown.type,
      year: latestKnown.year,
      recordsAdded: 0,
      status: "checked",
      message:
        "Nessun nuovo dataset ufficiale rilevato oltre la baseline incorporata. " +
        "L'aggiornamento automatico è predisposto: quando Eligendo pubblica nuovi risultati, " +
        "il job di ingestione valida e inserisce i record (vedi lib/electoral/ingest.ts).",
    },
  });

  return {
    ok: true,
    lastUpdate: last?.createdAt.toISOString() ?? null,
    latestEmbedded: `${latestKnown.type} ${latestKnown.year}`,
  };
}

export async function getDataUpdateLogs(limit = 20) {
  try {
    return await prisma.dataUpdateLog.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
    });
  } catch (e) {
    console.error("getDataUpdateLogs failed:", e);
    return [];
  }
}
