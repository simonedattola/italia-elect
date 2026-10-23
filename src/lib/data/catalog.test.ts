import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("catalogo scrutini", () => {
  it("contiene le politiche e non percentuali inventate sul 2022", () => {
    const file = "src/data/generated/catalog.json";
    assert.equal(existsSync(file), true, "manca il catalogo: npm run data:ingest");
    const catalog = JSON.parse(readFileSync(file, "utf8")) as {
      elections: { id: string; year: number; level: string }[];
      gaps: { detail: string }[];
    };
    const years = catalog.elections
      .filter((e) => e.id.startsWith("politiche-camera-") && e.id.endsWith("-bollettino"))
      .map((e) => e.year);
    for (const year of [1948, 1976, 1994, 2008, 2018, 2022]) {
      assert.ok(years.includes(year), `manca il bollettino ${year}`);
    }
    assert.ok(catalog.elections.some((e) => e.id === "politiche-camera-2022"));
    assert.ok(catalog.elections.some((e) => e.id === "politiche-senato-2022"));
    assert.ok(catalog.elections.some((e) => e.id === "europee-2024"));
    assert.ok(catalog.gaps.length >= 4);

    const camera = JSON.parse(readFileSync("src/data/generated/politiche-camera-2022.json", "utf8")) as {
      turnout: number;
      lists: { name: string; votes: number; percentage: number }[];
      colleges: unknown[];
    };
    assert.ok(camera.turnout > 60 && camera.turnout < 70);
    const fdi = camera.lists.find((l) => l.name.toUpperCase().includes("FRATELLI"));
    assert.ok(fdi && fdi.votes > 6_000_000);
    assert.ok(fdi.percentage > 25 && fdi.percentage < 28);
    assert.ok(camera.colleges.length >= 146);

    const bulletin = JSON.parse(
      readFileSync("src/data/generated/politiche-camera-2022-bollettino.json", "utf8"),
    ) as { lists: { name: string; votes: number | null; percentage: number }[] };
    const fdiBulletin = bulletin.lists.find((l) => l.name.toUpperCase().includes("FRATELLI"));
    assert.equal(fdiBulletin?.votes, null);
    assert.ok(fdiBulletin && Math.abs(fdiBulletin.percentage - 25.98) < 0.05);
  });
});