import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  components,
  createRegistry,
  emptyLine,
  packReady,
  partTierAt,
  placeholderTitle,
  type CastLike,
  type Props,
  type StateName,
  type ThemeChoice,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";

const def = components.Warranties;
const { examples, fallback, meta, props, probes } = def;
const theme = { preset: "calm", mode: "light", accent: "moss" } satisfies ThemeChoice;
const lamp = { thing: "Grow lamp", bought: "2024-02-29" };
const filled = {
  items: [
    { ...lamp, shop: "Garden Supply", price: 0, ends: "2024-03-30", receipt: "local:1" },
    { thing: "Heat mat", bought: "2022-09-21", ends: "2024-02-28" },
    { thing: "Travel crate", bought: "2024-01-01" },
    { thing: "Training lead", bought: "2024-01-01", ends: "2025-01-01" },
  ],
};
const at = (part: string) => `home/w1/${part}`;
const render = (value: unknown, state: StateName = "filled", thing?: string) =>
  addressedElements(
    renderInstance("Warranties", value, state, theme, {
      component: "w1",
      lang: "en-US",
      ...(thing && { thing }),
    }),
  );

function onLeapDay(run: () => void) {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2024, 1, 29, 12));
  try {
    run();
  } finally {
    vi.useRealTimers();
  }
}

describe("Warranties schema", () => {
  it.each(examples)("accepts a domain example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );

  it("accepts exact limits, same-day end dates and the shared defaults", () => {
    const max = {
      ...lamp,
      thing: "x".repeat(28),
      shop: "y".repeat(20),
      ends: lamp.bought,
      receipt: "lib:receipt",
    };
    expect(props.parse({ items: Array(6).fill(max) })).toMatchObject({
      items: Array(6).fill(max),
      detail: "full",
    });
    expect(props.parse({ items: [{ ...lamp, thing: "  Lamp  " }] }).items[0]?.thing).toBe("Lamp");
    expectTypeOf<Props<typeof props, typeof meta>["items"][number]["id"]>().toEqualTypeOf<string>();
  });

  it.each([
    {},
    { items: [] },
    { items: Array(7).fill(lamp) },
    { items: [{ ...lamp, thing: " " }] },
    { items: [{ ...lamp, thing: "x".repeat(29) }] },
    { items: [{ ...lamp, shop: "y".repeat(21) }] },
    { items: [{ ...lamp, bought: "2023-02-29" }] },
    { items: [{ ...lamp, ends: "2024-02-28" }] },
    { items: [{ ...lamp, ends: "tomorrow" }] },
    { items: [{ ...lamp, price: -1 }] },
    { items: [{ ...lamp, price: Infinity }] },
    { items: [{ ...lamp, receipt: "https://example.org/receipt.png" }] },
    { items: [{ ...lamp, status: "expired" }] },
    { items: [{ ...lamp, currency: "USD" }] },
    { items: [{ ...lamp, id: "r1" }] },
    { items: [lamp], detail: "hidden" },
    { items: [lamp], colour: "red" },
  ])("rejects invalid wire input: %j", (value) => expect(props.safeParse(value).success).toBe(false));
});

describe("Warranties fallback and metadata", () => {
  it("uses a cast title when possible and neutral copy otherwise", () => {
    const cast = { things: [{ type: "lamp", fields: ["name"] }], items: [] };
    const item = { id: "lamp", type: "lamp", sample: true, name: "Grow lamp" };
    const casts: CastLike[] = [
      { things: [], items: [] },
      { ...cast, items: [item] },
      { ...cast, items: [{ ...item, name: 7 }] },
      { ...cast, items: [{ ...item, name: "x".repeat(80) }] },
    ];
    const results = casts.map((value) => fallback({ cast: value, lang: "en" }));
    expect(results.map((value) => props.safeParse(value).success)).toEqual([true, true, true, true]);
    expect(results.map((value) => value.items[0]?.thing)).toEqual([
      placeholderTitle(0),
      lamp.thing,
      placeholderTitle(0),
      "x".repeat(28),
    ]);
  });

  it("preserves the phone tier, readiness gate and core-first probes", () => {
    expect(meta).toMatchObject({ tier: "phone", weight: 2 });
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(partTierAt(meta, {}, "root")).toBe("phone");
    expect(createRegistry({ packs: ["inventory"] }).ids.includes("Warranties")).toBe(packReady("inventory"));
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "choose", expect: "Warranties" }),
        expect.objectContaining({ kind: "choose", expect: "KeyValue" }),
        expect.objectContaining({ kind: "write", expect: "Warranties" }),
        expect.objectContaining({ kind: "write", variant: { axis: "detail", value: "brief" } }),
        expect.objectContaining({ kind: "read", screen: 1, expect: { address: "w1/r1", action: "press" } }),
      ]),
    );
  });
});

describe("Warranties states and parts", () => {
  it("renders addressable purchase details, optional photos, and all three derived statuses", () =>
    onLeapDay(() => {
      const parts = render(filled);
      expect(parts.get(at("r1/thing"))?.text).toEqual(["Grow lamp"]);
      expect(parts.get(at("r1/shop"))?.text).toEqual(["Garden Supply"]);
      expect(parts.get(at("r1/bought"))?.text).toEqual(["Bought Feb 29, 2024"]);
      expect(parts.get(at("r1/price"))?.text).toEqual(["$0"]);
      expect(parts.get(at("r1/receipt"))?.attributes).toContain('aria-label="Receipt for Grow lamp"');
      expect(parts.get(at("r1/status"))?.text).toEqual(["Ending soon"]);
      expect(parts.get(at("r2/status"))?.text).toEqual(["Expired"]);
      expect(parts.get(at("r4/status"))?.text).toEqual(["Covered"]);
      expect(parts.get(at("r1/root"))?.attributes).toContain('role="button"');
      expect(parts.get(at("r3/ends"))?.text).toEqual(["No end date recorded"]);
      for (const part of ["shop", "price", "receipt", "status"])
        expect(parts.has(at(`r3/${part}`))).toBe(false);
    }));

  it("brief hides purchase dates and prices without removing wire fields or renumbering any row", () => {
    const input = { ...filled, detail: "brief" };
    expect(props.parse(input).items).toEqual(filled.items);
    expect([...render(input).keys()]).toEqual(
      [...render(filled).keys()].filter((key) => !/\/(bought|price)$/.test(key)),
    );
  });

  it.each([undefined, "walk"])("uses shared empty copy for %s and hides rows", (thing) => {
    const parts = render(filled, "empty", thing);
    expect([...parts.keys()]).toEqual([at("root"), at("empty")]);
    expect(parts.get(at("empty"))?.text).toEqual([emptyLine(thing, "en-US")]);
    expect(meta.read(props.parse(filled), "empty", "en-US")).toEqual([]);
  });
});

const setup = (state: StateName = "filled", detail = "full") => {
  const onAction = vi.fn();
  const controller = createScreenController({
    screen: { id: "home", components: [{ ...filled, id: "w1", c: "Warranties", state, detail }] },
    defs: { Warranties: def },
    onAction,
  });
  return { controller, onAction };
};

describe("Warranties read and act", () => {
  it("reads visible status, exposes only row presses, and opens the intended record without confirmation", () =>
    onLeapDay(() => {
      const { controller, onAction } = setup("filled", "brief");
      const reading = controller.read();
      expect(reading).toContain("r1 Ending soon · Through 30 Mar 2024 · Receipt photo");
      expect(reading).toContain("r2 Expired · 28 Feb 2024");
      expect(reading).toContain("r3 No end date recorded");
      expect(reading).not.toMatch(/Bought|\$0/);
      expect(reading).toContain('"Grow lamp" · "Garden Supply" · photo:local:1');
      expect(reading).toMatch(/"Heat mat".*\[w1\/r2 press\]/);
      expect(controller.press("w1/r1/status").ok).toBe(false);
      expect(controller.press(at("r2/root")).ok).toBe(true);
      expect(controller.confirmation).toBeUndefined();
      expect(onAction).toHaveBeenCalledExactlyOnceWith({ address: at("r2"), action: "press" });
    }));

  it("offers no row actions while empty", () => {
    const { controller, onAction } = setup("empty");
    expect(controller.read()).toContain("w1 Warranties (empty)");
    expect(controller.read()).not.toContain("w1/r1");
    expect(controller.press("w1/r1").ok).toBe(false);
    expect(onAction).not.toHaveBeenCalled();
  });
});
