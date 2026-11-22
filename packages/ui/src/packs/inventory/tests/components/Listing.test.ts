import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  components,
  createRegistry,
  packReady,
  partTierAt,
  placeholderTitle,
  wordsFor,
  type CastLike,
  type Props,
  type StateName,
  type ThemeChoice,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";

const def = components.Listing;
const { examples, fallback, meta, props, probes } = def;
const theme = { preset: "calm", mode: "light", accent: "moss" } satisfies ThemeChoice;
const rent = examples[0]!;
const sale = examples[1]!;
const at = (part: string) => `home/l1/${part}`;
const markup = (value: unknown, state: StateName = "filled") =>
  renderInstance("Listing", value, state, theme, { component: "l1", lang: "en-US" });
const render = (value: unknown, state?: StateName) => addressedElements(markup(value, state));

describe("Listing schema", () => {
  it.each(examples)("accepts a domain example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );

  it("trims text, supplies variant defaults and accepts the exact text and fact bounds", () => {
    // prettier-ignore
    const max = {
      ...rent, title: "x".repeat(32), where: "x".repeat(40), about: "x".repeat(160), beds: 20, baths: 10,
    };
    expect(props.parse(max)).toMatchObject({ ...max, detail: "full" });
    expect(props.parse({ ...rent, title: "  Flat  ", price: 0, beds: 0, baths: 0, area: 0 }).title).toBe(
      "Flat",
    );
    expectTypeOf<Props<typeof props, typeof meta>["price"]>().toEqualTypeOf<number>();
  });

  it.each([
    {},
    { ...rent, title: " " },
    { ...rent, title: "x".repeat(33) },
    { ...rent, where: "x".repeat(41) },
    { ...rent, about: "x".repeat(161) },
    { ...rent, price: -1 },
    { ...rent, price: Infinity },
    { ...rent, price: "$950" },
    { ...rent, per: "year" },
    { ...rent, beds: -1 },
    { ...rent, beds: 21 },
    { ...rent, beds: 1.5 },
    { ...rent, baths: -1 },
    { ...rent, baths: 10.5 },
    { ...rent, area: -1 },
    { ...rent, area: Infinity },
    { ...rent, areaUnit: "acres" },
    { ...rent, from: "2026-02-29" },
    { ...rent, currency: "GBP" },
    { ...rent, saved: true },
    { ...rent, photo: "lib:plants" },
    { ...rent, surface: "tinted" },
    { ...rent, color: "red" },
  ])("rejects invalid wire input: %j", (value) => expect(props.safeParse(value).success).toBe(false));
});

describe("Listing fallback and metadata", () => {
  it("uses bounded cast data and falls back to neutral copy for missing or malformed data", () => {
    const things = [{ type: "offer", fields: ["name", "address"] }];
    const item = { id: "flat", type: "offer", sample: true, name: "Sunny flat", address: "14 Mill Lane" };
    const casts: CastLike[] = [
      { things: [], items: [] },
      { things, items: [item] },
      { things, items: [{ ...item, name: 4, address: false }] },
      { things, items: [{ ...item, name: "x".repeat(80), address: "y".repeat(80) }] },
    ];
    const [empty, fromCast, malformed, long] = casts.map((cast) =>
      props.parse(fallback({ cast, lang: "en-US" })),
    );
    expect(empty).toMatchObject({
      title: placeholderTitle(0, "en-US"),
      where: wordsFor("en-US").placeholderLabel,
      about: wordsFor("en-US").placeholderDetail,
    });
    expect(fromCast).toMatchObject({ title: item.name, where: item.address });
    expect(malformed).toEqual(empty);
    expect(long).toMatchObject({ title: "x".repeat(32), where: "y".repeat(40) });
  });

  it("has ready metadata, correct part tiers, pack gate, and core-first probes", () => {
    expect(meta).toMatchObject({ status: "ready", weight: 2, tier: "phone", states: ["filled", "loading"] });
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain("Card");
    expect(partTierAt(meta, {}, "contact")).toBe("service");
    expect(partTierAt(meta, {}, "save")).toBe("phone");
    expect(createRegistry({ packs: ["inventory"] }).ids.includes("Listing")).toBe(packReady("inventory"));
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "choose", expect: "Listing" }),
        expect.objectContaining({ kind: "choose", expect: "Card" }),
        expect.objectContaining({ kind: "write", expect: "Listing" }),
        expect.objectContaining({ kind: "write", variant: { axis: "detail", value: "brief" } }),
        expect.objectContaining({ kind: "read", expect: { address: "l1/contact", action: "press" } }),
      ]),
    );
  });
});

describe("Listing states and parts", () => {
  it("draws every part for a rental, with separate button, period, and unit addresses", () => {
    const parts = render(rent);
    expect([...parts.keys()].sort()).toEqual(meta.parts.map(at).sort());
    // prettier-ignore
    for (const [part, text] of Object.entries({
      title: rent.title, price: "$950", per: "/ month", beds: "2 beds", baths: "1 bath", area: "64",
      area_unit: "m²", where: rent.where, from: "Available from Dec 1, 2026", about: rent.about,
      contact_label: "Contact", save_label: "Save",
    })) expect(parts.get(at(part))?.text.join("").trim()).toBe(text);
    for (const part of ["contact", "save"])
      expect(parts.get(at(part))?.attributes).toContain('role="button"');
  });

  it("omits unavailable date and rent period for sale and hides only the brief description", () => {
    expect([...render(sale).keys()].sort()).toEqual(
      meta.parts
        .filter((part) => part !== "from" && part !== "per")
        .map(at)
        .sort(),
    );
    const brief = { ...rent, detail: "brief" };
    expect(props.parse(brief).about).toBe(rent.about);
    expect([...render(brief).keys()]).toEqual(
      [...render(rent).keys()].filter((part) => part !== at("about")),
    );
  });

  it("loads without showing domain content or exposing any controls", () => {
    const html = markup(rent, "loading");
    expect([...addressedElements(html).keys()]).toEqual([at("root")]);
    expect(html).toContain('aria-busy="true"');
    expect(html).not.toContain('role="button"');
    expect(html).not.toContain(`aria-label="${rent.title}"`);
  });
});

function setup(state: StateName = "filled", detail = "full") {
  const onAction = vi.fn();
  const controller = createScreenController({
    screen: { id: "home", components: [{ ...rent, id: "l1", c: "Listing", state, detail }] },
    defs: { Listing: def },
    lang: "en-US",
    onAction,
  });
  return { controller, onAction };
}

describe("Listing read and act", () => {
  it("reads visible facts and availability but excludes the description in brief", () => {
    const reading = setup().controller.read();
    expect(reading).toContain(
      "$950\u00a0/ month · 2 beds · 1 bath · 64\u00a0m² · 14 Mill Lane · Available from Dec 1, 2026",
    );
    expect(reading).toContain(rent.about);
    expect(setup("filled", "brief").controller.read()).not.toContain(rent.about);
  });

  it("routes contact separately from the reversible saved state", () => {
    const { controller, onAction } = setup();
    expect(controller.read()).toContain("[l1/contact press");
    expect(controller.read()).toContain("[l1/save toggle");
    expect(controller.press("l1/contact").ok).toBe(true);
    expect(onAction).toHaveBeenCalledExactlyOnceWith({ address: at("contact"), action: "press" });
    const toggle = { address: "l1/save", action: "toggle" } as const;
    expect(controller.act(toggle).ok).toBe(true);
    expect(controller.store.get(at("save"))).toBe(true);
    expect(controller.read()).toContain("[l1/save toggle:on]");
    expect(controller.act(toggle).ok).toBe(true);
    expect(controller.store.get(at("save"))).toBe(false);
    expect(controller.confirmation).toBeUndefined();
  });

  it("does not offer contact or saving while loading", () => {
    const { controller, onAction } = setup("loading");
    expect(controller.read()).toContain("Listing (loading)");
    expect(controller.read()).not.toMatch(/l1\/(contact|save)/);
    expect(controller.press("l1/contact").ok).toBe(false);
    expect(controller.act({ address: "l1/save", action: "toggle" }).ok).toBe(false);
    expect(onAction).not.toHaveBeenCalled();
  });
});
