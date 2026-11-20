import { describe, expect, it } from "vitest";
import {
  components,
  createRegistry,
  packReady,
  planAct,
  readComponent,
  type CastLike,
} from "@lmthing/ui/catalog";

const { Converter } = components;
const { props, examples, fallback, meta, probes } = Converter;

describe("Converter schema", () => {
  it.each(examples)("accepts each domain example", (example) => {
    expect(props.safeParse(example).success).toBe(true);
  });

  it("keeps the starting amount optional and accepts both boundaries", () => {
    expect(props.parse({})).toEqual({ surface: "card" }); // Omitted density inherits the app setting.
    for (const value of [0, 999999999]) expect(props.parse({ value }).value).toBe(value);
  });

  it.each([
    { value: -1 },
    { value: 1000000000 },
    { value: Infinity },
    { value: "25" },
    { rate: 150 },
    { date: "2026-11-19" },
    { home: "USD", local: "JPY" },
    { density: "tiny" },
    { color: "red" },
  ])("rejects invalid or host-only input", (input) => {
    expect(props.safeParse(input).success).toBe(false);
  });
});

describe("Converter fallback and contract", () => {
  it.each<CastLike>([
    { things: [], items: [] },
    {
      things: [{ type: "trip", fields: ["name"] }],
      items: [{ id: "trip", type: "trip", sample: true, name: "Tokyo" }],
    },
    { things: [], items: [{ id: "bad", type: "trip", sample: true, name: 150 }] },
  ])("does not fabricate a quote or choose an amount from an unrelated cast value", (cast) => {
    expect(fallback({ cast })).toEqual({});
    expect(props.safeParse(fallback({ cast })).success).toBe(true);
  });

  it("declares the parts, states and service tier without a confirmation", () => {
    expect(meta.parts).toEqual(["root", "from", "to", "swap", "rate_date"]);
    expect(meta.states).toEqual(["filled", "loading"]);
    expect(meta.tier).toBe("service");
    expect(meta).not.toHaveProperty("confirmParts");
  });

  it("retains the core near miss and follows pack readiness", () => {
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "choose", expect: "Converter" }),
        expect.objectContaining({ kind: "choose", expect: "Amount" }),
        expect.objectContaining({ kind: "write", expect: "Converter" }),
        expect.objectContaining({ kind: "read", expect: { address: "c1/swap", action: "press" } }),
      ]),
    );
    expect(createRegistry({ packs: ["trips"] }).ids.includes("Converter")).toBe(packReady("trips"));
  });
});

describe("Converter read and act", () => {
  it("reads the host quote and offers the three declared actions", () => {
    const data = { exchange_rates: [{ home: "USD", local: "JPY", rate: 150, date: "2026-11-19" }] };
    const read = readComponent(Converter, { value: 25 }, "c1", "filled", {}, "en-US", data).join(" ");
    for (const part of ["$25", "¥3,750", "Nov 19, 2026", "c1/from type", "c1/to type", "c1/swap press"])
      expect(read).toContain(part);
  });

  it("suppresses amounts and actions while loading and never offers a rate-date action", () => {
    expect(readComponent(Converter, { value: 25 }, "c1", "loading")).toEqual(["c1 Converter (loading)"]);
    const screen = { id: "tools", components: [{ c: "Converter", id: "c1" }] };
    expect(planAct(screen, components, {}, [{ address: "c1/rate_date", action: "press" }])).toMatchObject({
      ok: false,
      code: "not_actionable",
    });
  });
});
