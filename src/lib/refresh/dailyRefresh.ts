import { promises as fs } from "fs";
import path from "path";
import {
  generateAgentSample,
  summarizeDemographics,
  saveAgentSample,
  updateAgentsHourly,
  loadAgentSample,
  VIRTUAL_POPULATION,
  DEFAULT_AGENT_SAMPLE_SIZE,
} from "../agents";
import { refreshDailyFactors } from "../weights/factorCollector";
import { scanPartiesFromSources } from "../intelligence/party-scanner";
import { mergeDiscoveredParties } from "../electoral/partyRegistryCore";
import { meloniFollowerImpact } from "../social/impactCalculator";
import { buildSocialGraph } from "../network/socialGraph";
import { PARTIES } from "../electoral/parties";
import { buildPollingBaseline } from "../electoral/dynamicBaseline";
import { writeDailySnapshots } from "../data/realtime/snapshotWriter";

const DAILY_DIR = path.join(process.cwd(), "src/data/daily");
const SNAPSHOT_PATH = path.join(DAILY_DIR, "dashboard-snapshot.json");

export interface DashboardSnapshot {
  date: string;
  collectedAt: string;
  weightsUpdatedAt: string;
  virtualPopulation: number;
  agentSampleSize: number;
  demographics: Record<string, number>;
  votingIntent: Record<string, number>;
  confidenceLow: Record<string, number>;
  confidenceHigh: Record<string, number>;
  parties: Array<{ slug: string; name: string; pct: number; aiDetected?: boolean }>;
  socialImpactByAge: Record<string, number>;
  meloniPostImpact: { follower: number; nonFollower: number };
  sources: string[];
}

export async function generateAgentsIfNeeded(): Promise<void> {
  const existing = await loadAgentSample();
  if (existing && existing.agents.length > 0) return;

  const sampleSize = Number(process.env.AGENT_SAMPLE_SIZE ?? DEFAULT_AGENT_SAMPLE_SIZE);
  console.info(`[agents] generating sample ${sampleSize} (virtual ${VIRTUAL_POPULATION})`);
  const agents = generateAgentSample(sampleSize);
  await saveAgentSample(agents, {
    generatedAt: new Date().toISOString(),
    demographics: summarizeDemographics(agents),
  });
}

export async function dailyRefresh(): Promise<DashboardSnapshot> {
  console.info("[refresh] daily refresh start");

  const weights = await refreshDailyFactors();
  const scan = scanPartiesFromSources(new Set());
  const added = mergeDiscoveredParties(scan.discovered);
  const partyRefresh = { sources: scan.sources, added };

  await generateAgentsIfNeeded();
  let stored = await loadAgentSample();
  if (!stored) {
    const agents = generateAgentSample(DEFAULT_AGENT_SAMPLE_SIZE);
    await saveAgentSample(agents, {
      generatedAt: new Date().toISOString(),
      demographics: summarizeDemographics(agents),
    });
    stored = await loadAgentSample();
  }

  let agents = stored!.agents;
  agents = await updateAgentsHourly(agents);
  await saveAgentSample(agents, {
    generatedAt: stored!.meta.generatedAt,
    demographics: summarizeDemographics(agents),
  });

  const graph = buildSocialGraph(agents.slice(0, 500), 40);
  const follower = agents.find((a) => a.age === 22 && a.socialProfile.followsMeloni);
  const nonFollower = agents.find((a) => a.age === 22 && !a.socialProfile.followsMeloni);
  const meloniPostImpact = {
    follower: follower ? meloniFollowerImpact(follower, graph) : 0.85,
    nonFollower: nonFollower ? meloniFollowerImpact(nonFollower, graph) : 0.1,
  };

  const socialImpactByAge: Record<string, number> = {
    "18-24": meloniPostImpact.follower,
    "25-34": 0.55,
    "35-44": 0.45,
    "45-54": 0.35,
    "55-64": 0.2,
    "65+": 0.08,
  };

  const polling = buildPollingBaseline();

  const snapshot: DashboardSnapshot = {
    date: weights.date,
    collectedAt: new Date().toISOString(),
    weightsUpdatedAt: weights.collectedAt,
    virtualPopulation: VIRTUAL_POPULATION,
    agentSampleSize: agents.length,
    demographics: summarizeDemographics(agents),
    votingIntent: polling.shares,
    confidenceLow: Object.fromEntries(
      Object.entries(polling.shares).map(([k, v]) => [k, Math.max(0, v - 1.2)]),
    ),
    confidenceHigh: Object.fromEntries(
      Object.entries(polling.shares).map(([k, v]) => [k, v + 1.2]),
    ),
    parties: PARTIES.map((p) => ({
      slug: p.slug,
      name: p.shortName,
      pct: polling.shares[p.slug] ?? 0,
      aiDetected: p.aiDetected ?? false,
    })),
    socialImpactByAge,
    meloniPostImpact,
    sources: [
      ...weights.sources,
      ...polling.sources,
      ...partyRefresh.sources,
      "Eligendo / Ministero Interno",
      "ISTAT / AGCOM",
      "Agent sample (stratified)",
    ],
  };

  await fs.mkdir(DAILY_DIR, { recursive: true });
  await fs.writeFile(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2), "utf8");
  await fs.writeFile(
    path.join(DAILY_DIR, `${weights.date}-dashboard.json`),
    JSON.stringify(snapshot, null, 2),
    "utf8",
  );

  await writeDailySnapshots();

  console.info("[refresh] daily refresh complete", {
    lega: snapshot.votingIntent["lega"]?.toFixed(1),
    fdi: snapshot.votingIntent["fratelli-ditalia"]?.toFixed(1),
    fn: snapshot.votingIntent["futuro-nazionale"]?.toFixed(1),
  });

  return snapshot;
}

export async function loadDashboardSnapshot(): Promise<DashboardSnapshot | null> {
  try {
    const raw = await fs.readFile(SNAPSHOT_PATH, "utf8");
    return JSON.parse(raw) as DashboardSnapshot;
  } catch {
    return null;
  }
}

export function startRefreshSchedule(): void {
  const intervalMs = Number(process.env.REFRESH_INTERVAL_MS ?? 60 * 60 * 1000);

  dailyRefresh().catch((e) => console.error("[refresh] boot failed", e));

  setInterval(() => {
    dailyRefresh().catch((e) => console.error("[refresh] scheduled failed", e));
  }, intervalMs);
}
