/**
 * Test compatibilità multi-dimensionale — npm run test:compatibility-figures
 */
import {
  computeAgentCandidateCompatibility,
  type CompatibilityAgent,
} from "../src/lib/compatibility/compatibilityEngine";

function expect(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
  console.log("✓", msg);
}

const baseAgent: CompatibilityAgent = {
  age: 45,
  education: "media",
  zone: "urbano",
  votingHistory: {
    politiche2018: "lega",
    politiche2022: "lega",
    europee2024: "lega",
    regionali2023: "lega",
    comunali2024: "lega",
  },
  weights: {
    personal: 0.06,
    politics: 0.1,
    economy: 0.3,
    security: 0.15,
    health: 0.1,
    education: 0.05,
    environment: 0.05,
    geopolitics: 0.05,
    taxes: 0.05,
    weather: 0.02,
    sports: 0.02,
    social: 0.05,
    news: 0.05,
  },
};

async function main() {
  console.log("\n=== Test Compatibilità Figure ===\n");

  const mussoliniLega = computeAgentCandidateCompatibility(baseAgent, {
    firstName: "Benito",
    lastName: "Mussolini",
    partySlug: "lega",
  });
  console.log(`  Mussolini + Lega: ${mussoliniLega.score.toFixed(2)}`);
  expect(mussoliniLega.score >= 0.45 && mussoliniLega.score <= 0.55, "Mussolini/Lega ~0.5");

  const meloniFdi = computeAgentCandidateCompatibility(baseAgent, {
    firstName: "Giorgia",
    lastName: "Meloni",
    partySlug: "fratelli-ditalia",
  });
  console.log(`  Meloni + FdI: ${meloniFdi.score.toFixed(2)}`);
  expect(meloniFdi.score >= 0.85, "Meloni/FdI >= 0.85");

  const sallustiPd = computeAgentCandidateCompatibility(
    {
      ...baseAgent,
      votingHistory: {
        ...baseAgent.votingHistory,
        politiche2022: "partito-democratico",
      },
    },
    {
      firstName: "Alessandro",
      lastName: "Sallusti",
      partySlug: "partito-democratico",
      description: "Giornalista conservatore",
    },
  );
  console.log(`  Sallusti + PD: ${sallustiPd.score.toFixed(2)}`);
  expect(sallustiPd.score < 0.3, "Sallusti/PD < 0.3");
  console.log();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
