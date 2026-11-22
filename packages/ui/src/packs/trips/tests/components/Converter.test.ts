import { describe, expect, it } from "vitest";
import {
  components,
  createRegistry,
  packReady,
  planAct,
  readComponent,
  readScreen,
  type CastLike,
  type ScreenLike,
} from "@lmthing/ui/catalog";
import { createInteractionStore, createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";

const { Converter } = components;
const { props, examples, fallback, meta, probes } = Converter;
const data = { exchange_rates: [{ home: "USD", local: "JPY", rate: 150, date: "2026-11-19" }] };
const screen: ScreenLike = { id: "tools", components: [{ c: "Converter", id: "c1", value: 25 }] };
const swap = { address: "tools/c1/swap", action: "press" } as const;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;

describe("Converter schema", () => {
  it.each(examples)("accepts each domain example", (example) => {
    expect(props.safeParse(example).success).toBe(true);
  });

  it("keeps the starting amount optional and accepts both boundaries", () => {
    expect(props.parse({})).toEqual({ surface: "card", detail: "full" }); // Density inherits the app setting.
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
    { fromText: "25" },
    { toText: "25" },
    { swapped: true },
    { density: "tiny" },
    { detail: "hidden" },
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
        expect.objectContaining({ kind: "write", variant: { axis: "detail", value: "brief" } }),
        expect.objectContaining({ kind: "read", expect: { address: "c1/swap", action: "press" } }),
      ]),
    );
    expect(createRegistry({ packs: ["trips"] }).ids.includes("Converter")).toBe(packReady("trips"));
  });
});

describe("Converter reading", () => {
  it("reads the host quote and offers the three declared actions", () => {
    const read = readComponent(Converter, { value: 25 }, "c1", "filled", {}, "en-US", data).join(" ");
    for (const part of [
      "USD · Home amount: 25",
      "JPY · Local amount: 3750",
      "Nov 19, 2026",
      "c1/from type",
      "c1/to type",
      "c1/swap press",
    ])
      expect(read).toContain(part);
  });
});

describe("Converter actions", () => {
  it("updates the peer in both directions and swaps the exact active edit, even after clearing", () => {
    const store = createInteractionStore();
    const controller = createScreenController({ screen, defs: components, deviceData: data, store });
    const live = () => controller.liveControls(meta, { value: 25 }, "c1");
    expect(live()).toMatchObject({ fromText: "25", toText: "3750" });
    expect(controller.edit("tools/c1/to", "152.").ok).toBe(true);
    expect(live()).toMatchObject({ fromText: "1.01", toText: "152." });
    expect(controller.press(swap.address).ok).toBe(true);
    expect(live()).toMatchObject({ fromText: "152.", toText: "1.01" });
    expect(controller.edit("tools/c1/to", "04.50").ok).toBe(true);
    expect(live()).toMatchObject({ fromText: "675", toText: "04.50" });
    expect(controller.press(swap.address).ok).toBe(true);
    expect(live()).toMatchObject({ fromText: "04.50", toText: "675" });
    const read = readScreen(screen, components, store.snapshot(), "en-US", data);
    expect(read).toContain('c1/from type = "04.50"');
    expect(read).toContain('c1/to type = "675"');
    expect(controller.edit("tools/c1/from", "").ok).toBe(true);
    expect(controller.press(swap.address).ok).toBe(true);
    expect(live()).toMatchObject({ fromText: "", toText: "", swapped: true });
  });

  it("bounds linked text and rejects wrong action values", () => {
    const from = (value: unknown) => [{ address: "tools/c1/from", action: "type", value }] as const;
    expect(planAct(screen, components, {}, [...from("0".repeat(24))]).ok).toBe(true);
    for (const value of ["0".repeat(25), 5]) {
      expect(planAct(screen, components, {}, [...from(value)])).toMatchObject({
        ok: false,
        code: "invalid_value",
      });
    }
    expect(planAct(screen, components, {}, [{ ...swap, value: true }])).toMatchObject({
      ok: false,
      code: "invalid_value",
    });
  });

  it("suppresses amounts and actions while loading and never offers a rate-date action", () => {
    expect(readComponent(Converter, { value: 25 }, "c1", "loading")).toEqual(["c1 Converter (loading)"]);
    const loading: ScreenLike = { ...screen, components: [{ c: "Converter", id: "c1", state: "loading" }] };
    for (const step of [swap, { address: "tools/c1/from", action: "type", value: "2" }]) {
      expect(planAct(loading, components, {}, [step])).toMatchObject({ ok: false, code: "not_actionable" });
    }
    expect(
      planAct(screen, components, {}, [{ address: "tools/c1/rate_date", action: "press" }]),
    ).toMatchObject({
      ok: false,
      code: "not_actionable",
    });
  });
});

describe("Converter addressed view", () => {
  it("draws both fields, a swap button and the unavailable-rate line without inventing a quote", () => {
    const parts = addressedElements(
      renderInstance("Converter", { value: 25 }, "filled", theme, { deviceData: {} }),
    );
    expect(parts.get("home/c1/from")?.attributes).toContain('role="textbox"');
    expect(parts.get("home/c1/from")?.attributes).toContain('value="25"');
    expect(parts.get("home/c1/to")?.attributes).toContain('value=""');
    expect(parts.get("home/c1/swap")?.attributes).toContain('role="button"');
    expect(parts.get("home/c1/rate_date")?.text).toContain("Exchange rate unavailable");
  });

  it("hides only secondary detail in brief mode and leaves no enabled action while loading", () => {
    const brief = addressedElements(renderInstance("Converter", { detail: "brief" }, "filled", theme));
    expect(brief.has("home/c1/rate_date")).toBe(false);
    expect(["root", "from", "to", "swap"].every((part) => brief.has(`home/c1/${part}`))).toBe(true);
    const loading = addressedElements(renderInstance("Converter", { value: 25 }, "loading", theme));
    expect([...loading.keys()]).toEqual(["home/c1/root", "home/c1/from", "home/c1/to"]);
    for (const part of ["from", "to"]) {
      const placeholder = loading.get(`home/c1/${part}`);
      expect(placeholder?.attributes).not.toMatch(/role="textbox"|tabindex=|value=/i);
    }
  });
});
