/**
 * Test impatto social — npm run test:social
 */
import { generateAgentSample } from "../src/lib/agents";
import { buildSocialGraph } from "../src/lib/network/socialGraph";
import { meloniFollowerImpact } from "../src/lib/social/impactCalculator";

function expect(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
  console.log("✓", msg);
}

async function main() {
  console.log("\n=== Test Social Impact ===\n");
  const agents = generateAgentSample(2000, 77);
  const graph = buildSocialGraph(agents.slice(0, 300), 50);

  const agent1 = agents.find((a) => a.age === 22 && a.socialProfile.followsMeloni);
  const agent2 = agents.find((a) => a.age === 22 && !a.socialProfile.followsMeloni);

  if (!agent1 || !agent2) throw new Error("Missing test agents");

  const impact1 = meloniFollowerImpact(agent1, graph);
  const impact2 = meloniFollowerImpact(agent2, graph);

  console.log(`  Agente #1 (22, segue Meloni): impatto ${impact1.toFixed(2)}`);
  console.log(`  Agente #2 (22, non segue): impatto ${impact2.toFixed(2)}`);

  expect(impact1 > 0.7, `agent1 impact > 0.7 (${impact1})`);
  expect(impact2 < 0.25, `agent2 impact < 0.25 (${impact2})`);
  expect(impact1 > impact2 + 0.4, "follower impact >> non-follower");
  console.log();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
