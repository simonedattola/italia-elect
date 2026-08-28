/**
 * Verifica approfondita modelli predittivi — suite unificata.
 * Run: npm run verify:predictive
 */
import { execSync } from "node:child_process";

const NPM_TESTS = [
  "verify:master",
  "test:engine",
  "test:compatibility",
  "test:compatibility-figures",
  "test:recognition",
  "test:vannacci-compat",
  "test:preview-alignment",
  "test:text-influence",
  "test:campaign-text",
  "test:agents",
  "test:social",
  "test:weights",
  "test:context",
  "test:party-scanner",
  "test:microsim",
  "test:hybrid",
  "test:refresh",
  "test:api-smoke",
  "test:game",
];

function run(name: string) {
  process.stdout.write(`\n▶ ${name}…\n`);
  try {
    execSync(`npm run ${name}`, { stdio: "inherit", cwd: process.cwd() });
    return { name, ok: true };
  } catch {
    return { name, ok: false };
  }
}

async function main() {
  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║  Italia Elect — Verifica modelli predittivi      ║");
  console.log("╚══════════════════════════════════════════════════╝");

  const results = NPM_TESTS.map(run);
  const failed = results.filter((r) => !r.ok);
  const passed = results.filter((r) => r.ok);

  console.log("\n══════════════════════════════════════════════════");
  console.log(`Risultato: ${passed.length}/${results.length} suite passed`);
  if (failed.length) {
    console.log("Fallite:");
    for (const f of failed) console.log(`  ✗ ${f.name}`);
    process.exit(1);
  }
  console.log("✓ Tutti i modelli predittivi verificati\n");
}

main();
