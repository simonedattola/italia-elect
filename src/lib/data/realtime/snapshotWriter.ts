import { promises as fs } from "fs";
import path from "path";
import { realtimeDataFetcher } from "./DataFetcher";
import { loadAgentSample } from "@/lib/agents/agentStorage";
import { VIRTUAL_POPULATION } from "@/lib/agents/constants";

const SNAPSHOTS_ROOT = path.join(process.cwd(), "src/data/daily/snapshots");

export async function writeDailySnapshots(date = new Date()): Promise<string> {
  const day = date.toISOString().slice(0, 10);
  const dir = path.join(SNAPSHOTS_ROOT, day);
  await fs.mkdir(dir, { recursive: true });

  const baseline = await realtimeDataFetcher.fetchBaseline();
  const polls = await realtimeDataFetcher.fetchSondaggi();
  const social = await realtimeDataFetcher.fetchSocial();
  const agents = await loadAgentSample();

  await fs.writeFile(
    path.join(dir, "baseline.json"),
    JSON.stringify(baseline, null, 2),
    "utf8",
  );
  await fs.writeFile(
    path.join(dir, "sondaggi.json"),
    JSON.stringify(polls, null, 2),
    "utf8",
  );
  await fs.writeFile(
    path.join(dir, "social.json"),
    JSON.stringify(social, null, 2),
    "utf8",
  );
  await fs.writeFile(
    path.join(dir, "agents.json"),
    JSON.stringify(
      {
        virtualPopulation: VIRTUAL_POPULATION,
        sampleSize: agents?.agents.length ?? 0,
        scalingFactor: agents?.agents[0]?.virtualWeight ?? null,
        meta: agents?.meta ?? null,
      },
      null,
      2,
    ),
    "utf8",
  );

  const latest = {
    date: day,
    baseline: baseline.shares,
    pollCorrection: baseline.pollCorrection,
    methodology: baseline.methodology,
    lega: baseline.shares.lega,
    futuroNazionale: baseline.shares["futuro-nazionale"],
  };
  await fs.writeFile(
    path.join(SNAPSHOTS_ROOT, "latest.json"),
    JSON.stringify(latest, null, 2),
    "utf8",
  );

  return dir;
}
