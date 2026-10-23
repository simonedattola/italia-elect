import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { currentPollAggregate, currentPollMeta } from "./currentScenario";
import { initialPayload, listsFor } from "@/lib/simulator/project";

describe("sondaggi pubblicati", () => {
  it("la media include Futuro Nazionale e non lascia la Lega al risultato 2022", () => {
    const aggregate = currentPollAggregate();
    assert.ok((aggregate.shares["futuro-nazionale"] ?? 0) > 1);
    assert.ok((aggregate.shares.lega ?? 100) < 7.5);
    assert.ok((aggregate.shares.lega ?? 0) > 4);
    assert.equal(aggregate.quality, "published");
    assert.ok(currentPollMeta().pollCount >= 8);
  });

  it("ogni lista sopra l'1% nella media è nello scenario nazionale di default", () => {
    const aggregate = currentPollAggregate();
    const payload = initialPayload("nazionali");
    const lists = listsFor("nazionali");
    const ids = new Set(lists.map((list) => list.id));
    for (const [id, share] of Object.entries(aggregate.shares)) {
      if (share >= 1) assert.ok(ids.has(id), `${id} al ${share.toFixed(2)}% manca nello scenario`);
    }
    const lega = lists.find((list) => list.id === "lega");
    assert.ok(lega && lega.percentage < 7.5);
    assert.equal(payload.level, "nazionali");
    assert.notEqual(payload.baselineId, "politiche-camera-2022");
  });
});
