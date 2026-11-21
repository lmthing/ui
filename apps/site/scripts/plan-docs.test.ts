import { describe, expect, it } from "vitest";
import { readPackTable } from "./pack-table";
import { readPlanned, readWaves } from "./plan-docs";

const docs = new URL("../../../docs/catalog/packs/", import.meta.url).pathname;

describe("pack docs", () => {
  it("reads 57 packs with counts", () => {
    const table = readPackTable(`${docs}README.md`);
    expect(Object.keys(table)).toHaveLength(57);
    expect(table.booking?.components).toBe(8);
    expect(table.comms?.components).toBe(9);
    expect(table.comms?.archetypes).toBe(4);
  });
  it("reads the build waves", () => {
    const waves = readWaves(`${docs}build-plan.md`);
    expect(waves[0]?.packs).toContain("booking");
    expect(waves.flatMap((w) => w.packs)).toHaveLength(57);
    const wave6 = waves.find((w) => w.wave === 6);
    expect(wave6?.packs).toHaveLength(30);
    expect(wave6?.packs).toContain("comms");
    expect(wave6?.packs).toContain("perks");
  });
  it("reads planned components with their group and tier", () => {
    const planned = readPlanned(`${docs}play.md`);
    expect(planned.map((p) => p.id)).toContain("ScoreSheet");
    const booking = readPlanned(`${docs}booking.md`);
    expect(booking.map((p) => p.id)).toContain("ClassRoster");
    const comms = readPlanned(`${docs}comms.md`);
    expect(comms.map((p) => p.id)).toContain("ActiveCall");
    expect(comms.map((p) => p.id)).toContain("Inbox");
  });
});
