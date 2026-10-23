import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CAMERA_CIRCOSCRIZIONI,
  CAMERA_PROPORTIONAL,
  CAMERA_UNINOMINAL,
  SENATE_PROPORTIONAL,
  SENATE_REGIONS,
  SENATE_UNINOMINAL,
} from "./magnitudes";
import { allocateProportional } from "./rosatellum";
import { allocateEuropeanSeats, allocateMunicipalSeats } from "./otherLaws";
import { runSimulation } from "../model/engine";
import { aggregatePolls, pollWeight } from "../model/aggregatePolls";
import { affinitySwing, scoreAffinity } from "../model/affinity";
import { decodeShare, encodeShare } from "../model/shareLink";

describe("magnitudini Rosatellum", () => {
  it("chiude i conti di Camera e Senato sul territorio nazionale", () => {
    const camera = CAMERA_CIRCOSCRIZIONI.reduce(
      (a, c) => ({
        total: a.total + c.total,
        uni: a.uni + c.uninominal,
        prop: a.prop + c.proportional,
      }),
      { total: 0, uni: 0, prop: 0 },
    );
    assert.equal(camera.total, 392);
    assert.equal(camera.uni, CAMERA_UNINOMINAL);
    assert.equal(camera.prop, CAMERA_PROPORTIONAL);
    const senate = SENATE_REGIONS.reduce(
      (a, c) => ({
        total: a.total + c.total,
        uni: a.uni + c.uninominal,
        prop: a.prop + c.proportional,
      }),
      { total: 0, uni: 0, prop: 0 },
    );
    assert.equal(senate.total, 196);
    assert.equal(senate.uni, SENATE_UNINOMINAL);
    assert.equal(senate.prop, SENATE_PROPORTIONAL);
  });
});

describe("riparto proporzionale", () => {
  it("ripartisce in modo esatto con quoziente intero", () => {
    const result = allocateProportional(
      [
        { id: "a", votes: 50 },
        { id: "b", votes: 30 },
        { id: "c", votes: 20 },
      ],
      10,
      { listThreshold: 0, coalitionThreshold: 1, transferFloor: 1 },
    );
    assert.deepEqual(result.seats, { a: 5, b: 3, c: 2 });
  });

  it("esclude chi sta sotto il 3%", () => {
    const result = allocateProportional(
      [
        { id: "a", votes: 600 },
        { id: "b", votes: 371 },
        { id: "c", votes: 29 },
      ],
      10,
    );
    assert.equal(result.seats.c, 0);
    assert.equal(result.seats.a + result.seats.b, 10);
    assert.equal(result.eligibleIds.includes("c"), false);
  });

  it("trasferisce i voti tra 1% e 3% dentro la coalizione che passa il 10%", () => {
    const withTransfer = allocateProportional(
      [
        { id: "a", votes: 400, coalitionId: "cdx" },
        { id: "b", votes: 20, coalitionId: "cdx" },
        { id: "c", votes: 580 },
      ],
      10,
    );
    const without = allocateProportional(
      [
        { id: "a", votes: 400, coalitionId: "cdx" },
        { id: "c", votes: 580 },
      ],
      10,
    );
    assert.equal(withTransfer.seats.b, 0);
    assert.ok(withTransfer.effectiveVotes.a > 400);
    assert.equal(withTransfer.seats.a, 4);
    assert.equal(withTransfer.seats.c, 6);
    assert.equal(without.seats.a, 4);
  });

  it("applica la soglia del 4% alle europee", () => {
    const seats = allocateEuropeanSeats(
      [
        { id: "a", votes: 5000 },
        { id: "b", votes: 4600 },
        { id: "c", votes: 300 },
      ],
      10,
    );
    assert.equal(seats.c, 0);
    assert.equal((seats.a ?? 0) + (seats.b ?? 0), 10);
  });

  it("porta la lista del sindaco al 60% se il proporzionale non ci arriva", () => {
    const seats = allocateMunicipalSeats(
      [
        { id: "sindaco", votes: 400 },
        { id: "opposizione", votes: 350 },
        { id: "terza", votes: 250 },
      ],
      { councilSeats: 10, winnerIds: ["sindaco"], threshold: 0.03, majorityShare: 0.6 },
    );
    assert.equal(seats.sindaco, 6);
    assert.equal(seats.sindaco + seats.opposizione + seats.terza, 10);
  });
});

describe("motore Monte Carlo", () => {
  const lists = [
    { id: "a", name: "A", color: "#111", baseline: 40, coalitionId: "centrodestra", ideology: 0.6 },
    { id: "b", name: "B", color: "#222", baseline: 35, coalitionId: "centrosinistra", ideology: -0.4 },
    { id: "c", name: "C", color: "#333", baseline: 25, ideology: 0 },
  ];

  it("è riproducibile a parità di seme", () => {
    const first = runSimulation({ level: "nazionali", seed: 42, runs: 200, sigma: 1.2, lists });
    const second = runSimulation({ level: "nazionali", seed: 42, runs: 200, sigma: 1.2, lists });
    assert.equal(first.shares[0].mean, second.shares[0].mean);
    assert.equal(first.cameraSeats[0].mean, second.cameraSeats[0].mean);
  });

  it("con sigma zero resta sulla baseline e i seggi sommano a 245", () => {
    const result = runSimulation({ level: "nazionali", seed: 1, runs: 1, sigma: 0, lists });
    const shareSum = result.shares.reduce((a, s) => a + s.mean, 0);
    assert.ok(Math.abs(shareSum - 100) < 0.01);
    const seats = result.cameraSeats.reduce((a, s) => a + s.mean, 0);
    assert.equal(seats, 245);
    const a = result.shares.find((s) => s.id === "a");
    assert.ok(a && Math.abs(a.mean - 40) < 0.05);
  });

  it("tiene la media vicina alla baseline anche con molte liste piccole", () => {
    const lists = [
      { id: "big", name: "Big", color: "#111", baseline: 26, ideology: 0.4 },
      ...Array.from({ length: 20 }, (_, i) => ({
        id: `s${i}`,
        name: `S${i}`,
        color: "#999",
        baseline: 3.7,
        ideology: 0,
      })),
    ];
    const result = runSimulation({ level: "europee", seed: 3, runs: 400, sigma: 1.4, lists });
    const big = result.shares.find((share) => share.id === "big");
    assert.ok(big && Math.abs(big.mean - 26) < 0.8);
  });

  it("l'intervallo contiene la media", () => {
    const result = runSimulation({ level: "nazionali", seed: 7, runs: 300, sigma: 1.5, lists });
    for (const share of result.shares) {
      assert.ok(share.low <= share.mean + 1e-9);
      assert.ok(share.high >= share.mean - 1e-9);
    }
  });
});

describe("sondaggi e affinità", () => {
  it("dà più peso al sondaggio recente", () => {
    const now = Date.parse("2026-10-01");
    const fresh = pollWeight(
      { id: "1", institute: "A", publishedAt: "2026-09-28", sampleSize: 1000, reliability: 0.8, shares: { a: 50 } },
      now,
    );
    const old = pollWeight(
      { id: "2", institute: "A", publishedAt: "2026-01-01", sampleSize: 1000, reliability: 0.8, shares: { a: 50 } },
      now,
    );
    assert.ok(fresh > old);
  });

  it("applica l'house effect solo se dichiarato", () => {
    const aggregate = aggregatePolls(
      [
        {
          id: "1",
          institute: "A",
          publishedAt: "2026-09-01",
          sampleSize: 1000,
          reliability: 1,
          shares: { a: 40, b: 60 },
          houseEffect: { a: 5 },
          quality: "published",
        },
      ],
      Date.parse("2026-09-02"),
    );
    assert.ok(aggregate.shares.a < 40);
  });

  it("l'affinità bassa toglie punti, quella alta ne aggiunge meno", () => {
    assert.ok(affinitySwing(0, 100) < 0);
    assert.ok(affinitySwing(100, 100) > 0);
    assert.ok(Math.abs(affinitySwing(0, 100)) > affinitySwing(100, 100));
    const aligned = scoreAffinity("partito-democratico", {
      tax: -0.45,
      europe: -0.7,
      migration: -0.45,
      climate: -0.55,
      security: -0.25,
      work: -0.5,
    });
    assert.ok(aligned.score > 90);
  });
});

describe("link di condivisione", () => {
  it("fa il giro di codifica", () => {
    const payload = {
      v: 1 as const,
      level: "nazionali" as const,
      baselineId: "politiche-camera-2022",
      seed: 1,
      runs: 500,
      sigma: 1.5,
      pollWeight: 0,
      usePolls: false,
      factors: { economy: 0, security: 0, europe: 0, costOfLiving: 0 },
      coalitions: { a: "centrodestra" },
    };
    assert.deepEqual(decodeShare(encodeShare(payload)), payload);
    assert.equal(decodeShare("non-è-un-payload"), null);
  });
});
