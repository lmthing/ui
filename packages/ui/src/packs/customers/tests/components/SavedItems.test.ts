import { describe, expect, it, vi } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  packReady,
  readComponent,
  stampItemIds,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";

const def = components.SavedItems;
const { examples, fallback, meta, props, probes } = def;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const row = { id: "first", title: "Site visit", rate: 20.5, unit: "visit", category: "Visits" };
const input = {
  items: [
    row,
    { id: "second", title: "Brush", rate: 0, taxable: false },
    { ...row, id: "third", title: "Long visit", rate: 50 },
  ],
};
const address = (part: string) => `home/s1/${part}`;
const render = (seed: unknown, state: (typeof meta.states)[number] = "filled") =>
  renderInstance("SavedItems", seed, state, theme, { component: "s1" });

describe("SavedItems contract and fallback", () => {
  it.each(examples)("accepts a domain example", (value) => expect(props.safeParse(value).success).toBe(true));
  it.each([
    { items: [] },
    { items: Array.from({ length: 13 }, (_, i) => ({ ...row, id: `row_${i}` })) },
    { items: [row, row] },
    { items: [{ ...row, id: "x".repeat(25) }] },
    { items: [{ ...row, title: "x".repeat(33) }] },
    { items: [{ ...row, unit: "x".repeat(13) }] },
    { items: [{ ...row, category: "x".repeat(17) }] },
    { items: [{ ...row, taxable: "no" }] },
    { items: [{ ...row, rate: -1 }] },
    { items: [{ ...row, rate: Infinity }] },
    { items: [{ ...row, subtotal: 20.5 }] },
    { items: [row], color: "#123456" },
  ])("rejects invalid input", (value) => expect(props.safeParse(value).success).toBe(false));
  it("accepts twelve exact-boundary items and defaults taxable to true", () => {
    const items = Array.from({ length: 12 }, (_, i) => ({
      id: "a".repeat(22) + String(i).padStart(2, "0"),
      title: "b".repeat(32),
      unit: "c".repeat(12),
      category: "d".repeat(16),
      rate: i,
    }));
    const parsed = props.parse({ items });
    expect(parsed.items).toHaveLength(12);
    expect(parsed.items.every((entry) => entry.taxable)).toBe(true);
    expect(addressedElements(render({ items })).has(address("r12/add"))).toBe(true);
  });
  it("takes titles from declared cast fields and uses neutral fallback copy otherwise", () => {
    const things = [{ type: "record", fields: ["label"] }];
    const cast = { things, items: [{ id: "a", type: "record", sample: true, label: "A visit" }] };
    const empty = { things: [], items: [] };
    const bad = { things, items: [{ ...cast.items[0]!, label: 5 }] };
    for (const seed of [cast, empty, bad])
      expect(props.safeParse(fallback({ cast: seed })).success).toBe(true);
    expect(fallback({ cast }).items[0]?.title).toBe("A visit");
    expect(fallback({ cast: empty }).items[0]).toMatchObject({ title: "Item one", rate: 0 });
  });
  it("keeps the core near miss and is exposed only when the pack is ready", () => {
    expect(probes.map(({ kind }) => kind)).toEqual(["choose", "choose", "write", "write", "read"]);
    expect(probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "List" }));
    expect(createRegistry({ packs: ["customers"] }).ids.includes(meta.id)).toBe(packReady("customers"));
    expect(meta).toMatchObject({ weight: 3, dense: true, tier: "phone", confirmParts: ["remove"] });
  });
});

describe("SavedItems states, parts and reading", () => {
  it("groups in first-category order, keeps row addresses and reads the visible rates with host currency", () => {
    const grouped = { ...input, group: "sections" };
    const plain = addressedElements(render(input));
    const parts = addressedElements(render(grouped));
    expect([...parts.keys()].filter((part) => part.endsWith("/title"))).toEqual(
      ["r1", "r3", "r2"].map((id) => address(`${id}/title`)),
    );
    expect([...parts.keys()].filter((part) => !plain.has(part))).toEqual(
      ["r1", "r2"].map((id) => address(`${id}/category`)),
    );
    expect([...plain.keys()].filter((part) => !parts.has(part))).toEqual([]);
    expect(parts.get(address("r2/category"))?.text).toEqual(["Uncategorized"]);
    const reading = readComponent(def, grouped, "s1", "filled", {}, "en-GB", undefined, "GBP").join("\n");
    expect(reading).toContain("£20.50 / visit · Taxable");
    expect(reading).toContain("£0 · Not taxable");
    expect(reading).toContain("r1 Visits");
    expect(reading).not.toContain('"r1"');
    expect(reading.indexOf('"Long visit"')).toBeLessThan(reading.indexOf('"Brush"'));
    expect(readComponent(def, input, "s1").join("\n")).not.toContain("Visits");
  });
  it.each(["empty", "loading", "success", "error"] as const)(
    "draws %s without exposing billing actions",
    (state) => {
      const html = render(input, state);
      expect(affordancesOf(meta, stampItemIds(meta, props.parse(input)), "s1", {}, state)).toEqual([]);
      expect(addressedElements(html).has(address("r1/root"))).toBe(false);
      if (state === "loading") expect(html).toContain('aria-busy="true"');
      else expect(addressedElements(html).get(address("status"))?.text.length).toBeGreaterThan(0);
    },
  );
});

describe("SavedItems read and act", () => {
  it("offers separate open, add and remove actions for the same addressed record", () => {
    const text = readComponent(def, input, "s1").join("\n");
    const parts = addressedElements(render(input));
    for (const part of ["root", "add", "remove"]) {
      const relative = part === "root" ? "s1/r1" : `s1/r1/${part}`;
      expect(text).toContain(`[${relative} press`);
      expect(parts.get(address(`r1/${part}`))?.attributes).toContain('role="button"');
    }
  });
  it("dispatches open/add directly and remove only on confirmation; cancelling leaves no effect", () => {
    const screen = { id: "home", components: [{ id: "s1", c: meta.id, group: "sections", ...input }] };
    const onAction = vi.fn();
    const controller = createScreenController({ screen, defs: { SavedItems: def }, onAction });
    try {
      expect(controller.press("s1/r3").ok).toBe(true);
      expect(controller.press("s1/r3/add").ok).toBe(true);
      expect(onAction).toHaveBeenNthCalledWith(1, { address: address("r3"), action: "press" });
      expect(onAction).toHaveBeenNthCalledWith(2, { address: address("r3/add"), action: "press" });
      expect(controller.confirmation).toBeUndefined();
      onAction.mockClear();
      expect(controller.press("s1/r3/remove").ok).toBe(true);
      expect(controller.confirmation?.source).toBe(address("r3/remove"));
      expect(controller.press("confirm/cancel").ok).toBe(true);
      expect(onAction).not.toHaveBeenCalled();
      expect(controller.press("s1/r3/remove").ok).toBe(true);
      expect(controller.press("confirm/confirm").ok).toBe(true);
      expect(onAction).toHaveBeenCalledExactlyOnceWith({ address: address("r3/remove"), action: "press" });
    } finally {
      controller.dispose();
    }
  });
});
