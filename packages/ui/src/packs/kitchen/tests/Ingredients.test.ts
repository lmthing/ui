import { describe, expect, it, vi } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  readComponent,
  stampItemIds,
  type CastLike,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { elementAt, renderInstance } from "../../../../test/render";
import { ingredientsLabels, servingCount } from "../copy";
const { props, meta, examples, fallback, probes } = components.Ingredients;
const minimal = { servings: 1, groups: [{ items: [{ name: "Seed" }] }] };
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const row = { name: "a".repeat(28), note: "b".repeat(20), amount: 100000, unit: "none" };
describe("Ingredients contract and boundaries", () => {
  it.each(examples)("accepts domain examples", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it.each([
    {},
    { ...minimal, servings: 0 },
    { ...minimal, servings: 25 },
    { ...minimal, servings: 1.5 },
    { ...minimal, groups: [] },
    { ...minimal, groups: Array(4).fill(minimal.groups[0]) },
    { ...minimal, system: "imperial" },
    { ...minimal, rows: [] },
    { ...minimal, color: "red" },
    ...[{ label: "" }, { label: "a".repeat(21) }, { items: [] }, { items: Array(17).fill(row) }].map(
      (group) => ({ ...minimal, groups: [{ ...minimal.groups[0], ...group }] }),
    ),
    ...[
      { name: "" },
      { name: "   " },
      { name: "a".repeat(29) },
      { note: "" },
      { note: "a".repeat(21) },
      { amount: -1 },
      { amount: 100001 },
      { amount: Infinity },
      { unit: "oz" },
      { have: true },
      { id: "r1" },
      { pixels: 4 },
    ].map((item) => ({
      ...minimal,
      groups: [{ items: [{ name: "Seed", ...item }] }],
    })),
  ])("rejects invalid authored props", (input) => expect(props.safeParse(input).success).toBe(false));
  it("accepts all exact maxima and stamps 48 flat ids, never authored ids", () => {
    const input = {
      servings: 24,
      groups: Array.from({ length: 3 }, () => ({
        label: "a".repeat(20),
        items: Array.from({ length: 16 }, () => row),
      })),
    };
    expect(props.safeParse(input).success).toBe(true);
    const parsed = stampItemIds(meta, props.parse(input));
    expect((Reflect.get(parsed, "rows") as { id: string }[]).map((item) => item.id)).toEqual(
      Array.from({ length: 48 }, (_, index) => `r${index + 1}`),
    );
  });
  it("trims every authored string and applies neutral defaults", () => {
    const parsed = props.parse({
      ...minimal,
      groups: [{ label: " Group ", items: [{ name: " Seed ", note: " Note " }] }],
    });
    expect(parsed).toMatchObject({
      system: "metric",
      groups: [{ label: "Group", items: [{ name: "Seed", note: "Note", unit: "none" }] }],
    });
  });
});
describe("Ingredients fallback and metadata", () => {
  const casts: CastLike[] = [
    { things: [], items: [] },
    {
      things: [{ type: "plant", fields: ["name", "room"] }],
      items: [{ id: "one", type: "plant", sample: true, name: "Fern", room: "Bathroom" }],
    },
    { things: [], items: [{ id: "bad", type: "record", sample: true, name: 4 }] },
    {
      things: [{ type: "record", fields: ["title"] }],
      items: Array.from({ length: 8 }, (_, index) => ({
        id: `item_${index}`,
        type: "record",
        sample: false,
        title: "a".repeat(80),
      })),
    },
  ];
  it.each(casts)("validates empty, populated, malformed and overlong casts", (cast) =>
    expect(props.safeParse(fallback({ cast })).success).toBe(true),
  );
  it("uses shared neutral placeholders and cast helpers only", () => {
    expect(fallback({ cast: casts[0]! })).toMatchObject({
      servings: 1,
      groups: [{ items: [{ name: "Item one", unit: "none" }] }],
    });
    expect(fallback({ cast: casts[1]! }).groups[0]!.items[0]).toMatchObject({
      name: "Fern",
      note: "Bathroom",
    });
    expect(fallback({ cast: casts[3]! }).groups[0]!.items).toHaveLength(3);
  });
  it("preserves core-first probes, filled state, dense limits, phone tier and pack readiness", () => {
    expect(meta).toMatchObject({
      status: "ready",
      tier: "phone",
      dense: true,
      weight: 3,
      states: ["filled"],
    });
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain("Checklist");
    expect(meta.realPath).not.toBe("");
    expect(probes.filter((probe) => probe.kind === "choose")).toHaveLength(2);
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "Checklist")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "Ingredients" });
    expect(probes.filter((probe) => probe.kind === "read")).toHaveLength(2);
    expect(createRegistry({ packs: ["kitchen"] }).ids).not.toContain("Ingredients");
    expect(createRegistry({ packs: ["kitchen"], includeDrafts: true }).ids).toContain("Ingredients");
  });
});
describe("Ingredients filled parts and readings", () => {
  it.each(examples)("draws and reads every group, amount, unit, note and checkbox", (input) => {
    const html = renderInstance("Ingredients", input, "filled", theme);
    const reading = readComponent(components.Ingredients, input, "i1").join("\n");
    expect(html.match(/data-testid="home\/c1\/root"/g)).toHaveLength(1);
    const stamped = stampItemIds(meta, props.parse(input));
    for (const offered of affordancesOf(meta, stamped, "i1"))
      expect(reading).toContain(`[${offered.address} ${offered.action}`);
    expect(elementAt(html, "home/c1/servings").attributes).toContain('role="button"');
    expect(elementAt(html, "home/c1/system").attributes).toContain('role="radiogroup"');
    expect(elementAt(html, "home/c1/shop").attributes).toContain('role="button"');
    let index = 0;
    for (const group of input.groups) {
      if ("label" in group) expect(html).toContain(group.label);
      for (const item of group.items) {
        const base = `home/c1/r${++index}`;
        for (const part of ["root", "name", "have"]) expect(html).toContain(`data-testid="${base}/${part}"`);
        expect(elementAt(html, `${base}/have`).attributes).toContain('role="checkbox"');
        expect(reading).toContain(`r${index}: ${item.name}`);
        expect(html.includes(`data-testid="${base}/amount"`)).toBe("amount" in item);
        expect(html.includes(`data-testid="${base}/note"`)).toBe("note" in item);
      }
    }
    for (const label of [
      ingredientsLabels.servings,
      ingredientsLabels.metric,
      ingredientsLabels.us,
      ingredientsLabels.shop,
    ])
      expect(reading).toContain(label);
  });
  it("omits missing quantity parts and disables the serving endpoints", () => {
    for (const servings of [1, 24]) {
      const html = renderInstance("Ingredients", { ...minimal, servings }, "filled", theme);
      expect(html).not.toContain('data-testid="home/c1/r1/amount"');
      expect(html).not.toContain('data-testid="home/c1/r1/unit"');
      const label = servings === 1 ? ingredientsLabels.less : ingredientsLabels.more;
      expect(html).toMatch(new RegExp(`aria-disabled="true"[^>]*aria-label="${label}"`));
    }
  });
});
describe("Ingredients read/act", () => {
  it("dispatches repeated servings, unit selection, independent checks and missing-item shopping", () => {
    const onAction = vi.fn();
    const controller = createScreenController({
      screen: { id: "home", components: [{ id: "i1", c: "Ingredients", ...examples[0] }] },
      defs: components,
      onAction,
    });
    for (const action of ["increment", "increment", "decrement"])
      expect(controller.act({ address: "i1/servings", action })).toMatchObject({ ok: true });
    expect(servingCount(4, Number(controller.store.get("home/i1/servings")))).toBe(5);
    expect(controller.act({ address: "i1/system", action: "select", value: "US" })).toMatchObject({
      ok: true,
    });
    expect(controller.store.get("home/i1/system")).toBe("US");
    expect(controller.press("i1/r1/have")).toMatchObject({ ok: true });
    expect(controller.store.get("home/i1/r1/have")).toBe(true);
    expect(controller.press("i1/r2/have")).toMatchObject({ ok: true });
    expect(controller.press("i1/r1/have")).toMatchObject({ ok: true });
    expect(controller.store.get("home/i1/r1/have")).toBe(false);
    expect(controller.store.get("home/i1/r2/have")).toBe(true);
    expect(controller.press("i1/shop")).toMatchObject({ ok: true });
    expect(onAction).toHaveBeenLastCalledWith({ address: "home/i1/shop", action: "press" });
    expect(controller.press("i1/r1/name")).toMatchObject({ ok: false });
    expect(controller.act({ address: "i1/r1/have", action: "check", value: "yes" })).toMatchObject({
      ok: false,
    });
    expect(controller.confirmation).toBeUndefined();
    controller.dispose();
  });
});
