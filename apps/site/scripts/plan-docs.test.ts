import { describe, expect, it } from "vitest";
import { readPackTable } from "./pack-table";
import { readPlanned, readWaves } from "./plan-docs";

const docs = new URL("../../../docs/catalog/packs/", import.meta.url).pathname;

describe("pack docs", () => {
  it("reads 27 packs with counts", () => {
    const table = readPackTable(`${docs}README.md`);
    expect(Object.keys(table)).toHaveLength(27);
    expect(table.booking?.components).toBeGreaterThan(0);
  });
  it("reads the build waves", () => {
    const waves = readWaves(`${docs}build-plan.md`);
    expect(waves[0]?.packs).toContain("booking");
    expect(waves.flatMap((w) => w.packs)).toHaveLength(27);
  });
  it("reads planned components with their group and tier", () => {
    const planned = readPlanned(`${docs}play.md`);
    expect(planned.map((p) => p.id)).toContain("ScoreSheet");
  });
});
