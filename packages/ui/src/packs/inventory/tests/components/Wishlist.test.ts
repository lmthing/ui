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

const def = components.Wishlist;
const { examples, fallback, meta, props, probes } = def;
const theme = { preset: "calm", mode: "light", accent: "moss" } satisfies ThemeChoice;
const light = { name: "Clip-on grow light", priority: 1 };
const lead = { name: "Reflective lead", priority: 3 };
const filled = {
  items: [{ ...light, where: "Garden Supply", photo: "lib:plants", price: 0, target: 25.5 }, lead],
};
const at = (part: string) => `home/w1/${part}`;
const render = (value: unknown, state: StateName = "filled") =>
  addressedElements(renderInstance("Wishlist", value, state, theme, { component: "w1", lang: "en-US" }));

describe("Wishlist schema", () => {
  it.each(examples)("accepts a domain example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );

  it("accepts the exact text and count bounds, and stamps item ids only in view props", () => {
    const item = { ...light, name: "x".repeat(28), where: "y".repeat(24), photo: "local:1", price: 0 };
    expect(props.parse({ items: Array(6).fill(item) })).toMatchObject({
      items: Array(6).fill(item),
      detail: "full",
      surface: "card",
    });
    expect(props.parse({ items: [{ ...lead, name: "  Lead  " }] }).items[0]?.name).toBe("Lead");
    expectTypeOf<Props<typeof props, typeof meta>["items"][number]["id"]>().toEqualTypeOf<string>();
  });

  it.each([
    {},
    { items: [] },
    { items: Array(7).fill(light) },
    { items: [{ ...light, name: " " }] },
    { items: [{ ...light, name: "x".repeat(29) }] },
    { items: [{ ...light, where: "y".repeat(25) }] },
    { items: [{ ...light, price: -1 }] },
    { items: [{ ...light, target: -1 }] },
    { items: [{ ...light, price: Infinity }] },
    { items: [{ ...light, target: "25" }] },
    { items: [{ ...light, priority: 0 }] },
    { items: [{ ...light, priority: 4 }] },
    { items: [{ ...light, priority: 1.5 }] },
    { items: [{ ...light, photo: "https://example.org/wish.png" }] },
    { items: [{ ...light, currency: "USD" }] },
    { items: [{ ...light, id: "r1" }] },
    { items: [{ ...light, got: true }] },
    { items: [light], detail: "hidden" },
    { items: [light], colour: "red" },
  ])("rejects invalid wire input: %j", (value) => expect(props.safeParse(value).success).toBe(false));
});

describe("Wishlist fallback and metadata", () => {
  it("uses bounded cast fields and neutral titles for empty or unusable cast content", () => {
    const cast = { things: [{ type: "lamp", fields: ["name", "shop"] }], items: [] };
    const item = { id: "lamp", type: "lamp", sample: true, name: light.name, shop: "Garden Supply" };
    const casts: CastLike[] = [
      { things: [], items: [] },
      { ...cast, items: [item] },
      { ...cast, items: [{ ...item, name: 7, shop: false }] },
      { ...cast, items: Array(5).fill({ ...item, name: "x".repeat(80), shop: "y".repeat(80) }) },
    ];
    const results = casts.map((value) => fallback({ cast: value, lang: "en" }));
    for (const result of results) expect(props.safeParse(result).success).toBe(true);
    expect(results[0]?.items).toEqual([{ name: placeholderTitle(0, "en"), priority: 2 }]);
    expect(results[1]?.items[0]).toEqual({ name: light.name, where: item.shop, priority: 2 });
    expect(results[2]?.items[0]).toMatchObject({ name: placeholderTitle(0, "en"), priority: 2 });
    expect(results[3]?.items).toHaveLength(3);
    expect(results[3]?.items[0]).toMatchObject({ name: "x".repeat(28), where: "y".repeat(24) });
  });

  it("preserves the phone tier, pack gate, and core-first behavior probes", () => {
    expect(meta).toMatchObject({ weight: 2, tier: "phone", confirmParts: ["got"] });
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain("Checklist");
    expect(partTierAt(meta, {}, "got")).toBe("phone");
    expect(createRegistry({ packs: ["inventory"] }).ids.includes("Wishlist")).toBe(packReady("inventory"));
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "choose", expect: "Wishlist" }),
        expect.objectContaining({ kind: "choose", expect: "Checklist" }),
        expect.objectContaining({ kind: "write", expect: "Wishlist" }),
        expect.objectContaining({ kind: "write", variant: { axis: "detail", value: "brief" } }),
        expect.objectContaining({ kind: "read", expect: { address: "w1/r1/got", action: "press" } }),
      ]),
    );
  });
});

describe("Wishlist states and parts", () => {
  it("draws each supplied field and both controls, without placeholder fields on a sparse row", () => {
    const parts = render(filled);
    expect(parts.get(at("r1/name"))?.text).toEqual([light.name]);
    expect(parts.get(at("r1/price"))?.text).toEqual(["Price $0"]);
    expect(parts.get(at("r1/target"))?.text).toEqual(["Target $25.50"]);
    expect(parts.get(at("r1/priority"))?.text).toEqual(["High priority"]);
    expect(parts.get(at("r2/priority"))?.text).toEqual(["Low priority"]);
    expect(parts.get(at("r1/where"))?.text).toEqual(["Garden Supply"]);
    expect(parts.get(at("r1/photo"))?.attributes).toContain(`aria-label="${light.name}"`);
    expect(parts.get(at("r1/got_label"))?.text).toEqual(["Mark as owned"]);
    expect(parts.has(at("r1/trail"))).toBe(true);
    for (const part of ["r1/root", "r1/got", "r2/root", "r2/got"])
      expect(parts.get(at(part))?.attributes).toContain('role="button"');
    for (const part of ["photo", "price", "target", "where"]) expect(parts.has(at(`r2/${part}`))).toBe(false);
  });

  it("hides only target in brief, without changing stored amounts or the other addresses", () => {
    const input = { ...filled, detail: "brief", density: "compact", surface: "outlined" };
    expect(props.parse(input).items).toEqual(filled.items);
    expect([...render(input).keys()]).toEqual(
      [...render(filled).keys()].filter((key) => !key.endsWith("/target")),
    );
  });

  it("names the empty state without giving it item addresses", () => {
    const parts = render(filled, "empty");
    expect([...parts.keys()]).toEqual([at("root"), at("empty")]);
    expect(parts.get(at("empty"))?.text).toEqual([emptyLine(undefined, "en-US")]);
    const withThing = addressedElements(
      renderInstance("Wishlist", filled, "empty", theme, { component: "w1", thing: "walk" }),
    );
    expect(withThing.get(at("empty"))?.text).toEqual([emptyLine("walk")]);
  });
});

const setup = (state: StateName = "filled", detail = "full") => {
  const onAction = vi.fn();
  const controller = createScreenController({
    screen: { id: "home", components: [{ ...filled, id: "w1", c: "Wishlist", state, detail }] },
    defs: { Wishlist: def },
    onAction,
  });
  return { controller, onAction };
};

describe("Wishlist read and act", () => {
  it("reads the shown amounts, priority, and separate row and acquisition actions", () => {
    const { controller, onAction } = setup();
    const reading = controller.read();
    expect(reading).toContain("r1 Price $0 · Target $25.50 · High priority · Mark as owned");
    expect(reading).toMatch(/"Reflective lead".*\[w1\/r2\/got press\].*\[w1\/r2 press\]/);
    expect(setup("filled", "brief").controller.read()).not.toContain("Target");
    expect(controller.press("w1/r1/target").ok).toBe(false);
    expect(controller.press(at("r2/root")).ok).toBe(true);
    expect(controller.confirmation).toBeUndefined();
    expect(onAction).toHaveBeenCalledExactlyOnceWith({ address: at("r2"), action: "press" });
  });

  it("delivers the acquisition for only the confirmed row", () => {
    const { controller, onAction } = setup();
    expect(controller.press("w1/r1/got").ok).toBe(true);
    expect(controller.confirmation?.source).toBe(at("r1/got"));
    expect(onAction).not.toHaveBeenCalled();
    expect(controller.press("confirm/cancel").ok).toBe(true);
    expect(onAction).not.toHaveBeenCalled();
    expect(controller.press("w1/r2/got").ok).toBe(true);
    expect(controller.press("confirm/confirm").ok).toBe(true);
    expect(onAction).toHaveBeenCalledExactlyOnceWith({ address: at("r2/got"), action: "press" });
  });

  it("offers neither row action while empty", () => {
    const { controller, onAction } = setup("empty");
    expect(controller.read()).toContain("w1 Wishlist (empty)");
    expect(controller.read()).not.toContain("w1/r1");
    expect(controller.press("w1/r1").ok).toBe(false);
    expect(controller.press("w1/r1/got").ok).toBe(false);
    expect(onAction).not.toHaveBeenCalled();
  });
});
