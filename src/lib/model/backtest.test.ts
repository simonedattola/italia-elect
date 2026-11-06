import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { runBacktests } from "./backtest";

describe("backtest pre-voto", () => {
  const rows = runBacktests();

  it("usa solo sondaggi chiusi prima del silenzio elettorale", () => {
    const file = JSON.parse(readFileSync("src/data/polls/backtest.json", "utf8")) as {
      elections: { id: string; cutoff: string; polls: { publishedAt: string }[] }[];
    };
    assert.equal(rows.length, 4);
    for (const row of rows) {
      assert.ok(row.pollCount >= 8, `${row.id} ha ${row.pollCount} sondaggi`);
      assert.ok(row.listMae > 0 && row.listMae < 4, `${row.id} MAE liste ${row.listMae}`);
      assert.ok(
        row.proportionalSeatError != null && row.proportionalSeatError <= 42,
        `${row.id} seggi ${row.proportionalSeatError}`,
      );
      const source = file.elections.find((item) => item.id === row.id);
      assert.ok(source);
      for (const poll of source.polls) {
        assert.ok(poll.publishedAt <= source.cutoff, `${poll.publishedAt} dopo ${source.cutoff}`);
      }
    }
  });

  it("il 2018 e il 2022 vanno nella direzione dello scrutinio sulle liste maggiori", () => {
    const camera2018 = rows.find((row) => row.id === "camera-2018");
    const camera2022 = rows.find((row) => row.id === "camera-2022");
    assert.ok(camera2018 && camera2022);
    const share = (row: typeof camera2018, id: string) => row?.lists.find((item) => item.id === id);
    const m5s = share(camera2018, "movimento-5-stelle");
    const pd = share(camera2018, "partito-democratico");
    assert.ok(m5s && pd);
    assert.equal(m5s.predicted > pd.predicted, m5s.official > pd.official);
    const fdi = share(camera2022, "fratelli-ditalia");
    const lega = share(camera2022, "lega");
    assert.ok(fdi && lega);
    assert.equal(fdi.predicted > lega.predicted, fdi.official > lega.official);
    for (const row of [camera2018, camera2022]) {
      assert.ok(row.coalitionMae != null && row.coalitionMae < 4, `${row.id} coalizioni ${row.coalitionMae}`);
    }
  });

  it("il 2018 include il febbraio prima del silenzio e il 2022 la lista Azione–Italia Viva", () => {
    const file = JSON.parse(readFileSync("src/data/polls/backtest.json", "utf8")) as {
      elections: { id: string; cutoff: string; polls: { publishedAt: string; shares: Record<string, number> }[] }[];
    };
    const camera2018 = file.elections.find((item) => item.id === "camera-2018");
    const camera2022 = file.elections.find((item) => item.id === "camera-2022");
    assert.ok(camera2018 && camera2022);
    assert.ok(camera2018.polls.some((poll) => poll.publishedAt >= "2018-01-01" && poll.publishedAt <= camera2018.cutoff));
    assert.ok(
      camera2022.polls.some(
        (poll) => poll.publishedAt >= "2022-08-01" && poll.publishedAt <= camera2022.cutoff && poll.shares["azione-iv"] != null,
      ),
    );
  });
});
