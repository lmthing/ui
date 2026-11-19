import { expect, it } from "vitest";
import { variantAxes } from "../../props";
import { writerInput } from "../../format";
import { scoreWrite } from "../score";
import { variantProbeDefinitions } from "./variant-probe-definitions";

it("pairs every axis with one positive and one plain brief, without reusing a recording key", () => {
  const probes = variantProbeDefinitions.flatMap((def) => {
    expect(def.props.safeParse(writerInput(def, def.examples[0])).success).toBe(true);
    return def.probes.flatMap((probe) => (probe.kind === "write" && probe.variant ? [probe] : []));
  });
  expect(new Set(probes.map(({ brief }) => brief)).size).toBe(probes.length);
  expect(probes).toHaveLength(Object.keys(variantAxes).length * 2);
  for (const axis of Object.keys(variantAxes)) {
    const pair = probes.filter(({ variant }) => variant!.axis === axis);
    expect(pair).toHaveLength(2);
    expect(pair[0]!.variant!.value).not.toBeNull();
    expect(pair[1]!.variant).toEqual({ ...pair[0]!.variant, value: null });
    expect(pair[1]!.expect).toBe(pair[0]!.expect);
  }
});

it("scores the authored variant without repairing it or letting defaults hide an explicit choice", () => {
  const def = variantProbeDefinitions.find(({ meta }) => meta.id === "Card")!;
  const reply = (value: Record<string, unknown>) => JSON.stringify({ c: "Card", title: "Fern", ...value });
  const hero = { axis: "emphasis", value: "hero" } as const;
  const plain = { axis: "emphasis", value: null } as const;
  expect(scoreWrite(reply({ emphasis: "hero" }), def, hero).pass).toBe(true);
  expect(scoreWrite(reply({ emphasis: "normal" }), def, hero).pass).toBe(false);
  expect(scoreWrite(reply({ emphasis: "heroic" }), def, hero).pass).toBe(false);
  expect(scoreWrite(reply({ emphasis: null }), def, plain).pass).toBe(true);
  expect(scoreWrite(reply({ emphasis: "normal" }), def, plain).pass).toBe(false);
  expect(scoreWrite(reply({}), def, { axis: "labels", value: null }).pass).toBe(false);
});

it("checks item positives at the target row and rejects an unsolicited choice on any row", () => {
  const def = variantProbeDefinitions.find(({ meta }) => meta.id === "List")!;
  const reply = (first: unknown, second: unknown) =>
    JSON.stringify({
      c: "List",
      rows: [
        { title: "Fern", mark: first },
        { title: "Basil", mark: second },
      ],
    });
  const mark = { axis: "mark", value: "highlight", item: 0 } as const;
  const plain = { ...mark, value: null } as const;
  expect(scoreWrite(reply("highlight", null), def, mark).pass).toBe(true);
  expect(scoreWrite(reply(null, "highlight"), def, mark).pass).toBe(false);
  expect(scoreWrite(reply(null, null), def, plain).pass).toBe(true);
  expect(scoreWrite(reply(null, "highlight"), def, plain).pass).toBe(false);
});
