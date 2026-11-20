import { describe, expect, expectTypeOf, it } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  packReady,
  placeholderTitle,
  readComponent,
  stampItemIds,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";

const { meta, props, examples, fallback, probes } = components.PackingList;
const packing = examples[0]!;
const clothes = packing.groups[0]!;
const shirt = clothes.items[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const empty: CastLike = { things: [], items: [] };
const controllerFor = (state: "filled" | "empty" | "success") =>
  createScreenController({
    screen: { id: "home", components: [{ ...packing, id: "p1", c: "PackingList", state }] },
    defs: components,
    requireMounted: false,
  });
const added = { address: "p1/add", action: "type", part: "add", detail: "" };

describe("PackingList schema and boundaries", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("trims text, applies defaults and preserves authored quantities in brief", () => {
    expect(props.parse(packing)).toMatchObject({ surface: "card", detail: "full" });
    const brief = props.parse({ detail: "brief", groups: [{ label: " Clothes ", items: [shirt] }] });
    expect(brief.groups[0]).toMatchObject({ label: "Clothes", items: [shirt] });
    expectTypeOf<Props<typeof props, typeof meta>["groups"][number]["id"]>().toEqualTypeOf<string>();
  });
  it.each([
    {},
    { ...packing, progress: 50 },
    { ...packing, surface: "shadow" },
    { ...packing, detail: "short" },
    { ...packing, density: "dense" },
    { ...packing, color: "red" },
    { groups: [] },
    { groups: Array(7).fill(clothes) },
    { groups: [{ ...clothes, label: "x".repeat(17) }] },
    { groups: [{ ...clothes, id: "r1" }] },
    { groups: [{ ...clothes, packed_1: shirt }] },
    { groups: [{ ...clothes, items: [] }] },
    { groups: [{ ...clothes, items: Array(11).fill(shirt) }] },
  ])("rejects invalid list or group input", (input) => expect(props.safeParse(input).success).toBe(false));
  it.each([
    { name: "   " },
    { name: "x".repeat(29) },
    { qty: 0 },
    { qty: 1000 },
    { qty: 1.5 },
    { packed: undefined },
  ])("rejects invalid item input %j", (change) =>
    expect(
      props.safeParse({ groups: [{ label: "Clothes", items: [{ ...shirt, ...change }] }] }).success,
    ).toBe(false),
  );
  it("can address the last check at exact dense limits", () => {
    const item = { name: "x".repeat(28), qty: 999, packed: false };
    const group = { label: "x".repeat(16), items: Array(10).fill(item) };
    const parsed = stampItemIds(meta, props.parse({ groups: Array(6).fill(group) }));
    const actions = affordancesOf(meta, parsed, "p1");
    expect(actions).toHaveLength(61);
    expect(actions.at(-1)).toMatchObject({ address: "p1/r6/packed_10", action: "check", detail: ":todo" });
  });
});

describe("PackingList fallback and metadata", () => {
  it("uses cast content and neutral placeholders", () => {
    const relevant: CastLike = {
      things: [{ type: "gear", fields: ["name", "detail"] }],
      items: [{ id: "pouch", type: "gear", sample: true, name: "Pouch", detail: "Toiletries" }],
    };
    const malformed: CastLike = { things: [], items: [{ id: "bad", type: "gear", sample: true, name: 4 }] };
    for (const cast of [empty, relevant, malformed])
      expect(props.safeParse(fallback({ cast })).success).toBe(true);
    expect(fallback({ cast: relevant }).groups[0]).toEqual({
      label: "Toiletries",
      items: [{ name: "Pouch", packed: false }],
    });
    expect(fallback({ cast: empty }).groups[0]?.items).toEqual([
      { name: placeholderTitle(0), packed: false },
    ]);
  });
  it("keeps the pack gate, phone tier, and behavior and variant probes", () => {
    expect(meta.status).toBe("ready");
    expect(meta.tier).toBe("phone");
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(createRegistry({ packs: ["trips"] }).ids.includes("PackingList")).toBe(packReady("trips"));
    expect(probes.filter((probe) => probe.kind === "choose").map((probe) => probe.expect)).toEqual([
      "PackingList",
      "Checklist",
    ]);
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "write", expect: "PackingList" }),
        expect.objectContaining({ kind: "write", variant: { axis: "detail", value: "brief" } }),
        expect.objectContaining({ kind: "read", expect: { address: "p1/r1/packed_2", action: "check" } }),
        expect.objectContaining({ kind: "read", expect: { address: "p1/add", action: "type" } }),
      ]),
    );
  });
});

describe("PackingList rendered parts and reading", () => {
  it.each(["full", "brief"] as const)(
    "renders %s and keeps the reading and check addresses in step",
    (detail) => {
      const input = { ...packing, detail };
      const html = renderInstance("PackingList", input, "filled", theme);
      const parts = addressedElements(html);
      expect(parts.get("home/c1/r1/packed_1")?.attributes).toContain('aria-checked="true"');
      expect(parts.get("home/c1/r1/packed_2")?.attributes).toContain('aria-checked="false"');
      const actions = affordancesOf(meta, stampItemIds(meta, props.parse(input)), "p1");
      expect(actions.map(({ address }) => address)).toEqual([
        "p1/add",
        "p1/r1/packed_1",
        "p1/r1/packed_2",
        "p1/r2/packed_1",
      ]);
      for (const { address, action } of actions) {
        const role = action === "check" ? "checkbox" : "textbox";
        expect(parts.get(`home/${address.replace("p1", "c1")}`)?.attributes).toContain(`role="${role}"`);
      }
      const read = readComponent(components.PackingList, input, "p1").join("\n");
      for (const text of ["33%", "Clothes", "Tech", "Rain jacket", "Add an item"]) {
        expect(html).toContain(text);
        expect(read).toContain(text);
      }
      expect(parts.has("home/c1/r1/qty_1")).toBe(detail === "full");
      expect(parts.has("home/c1/r1/qty_2")).toBe(false);
      expect(read.includes("×3")).toBe(detail === "full");
    },
  );
});

describe("PackingList state and action dispatch", () => {
  it("updates the live share on repeated checks, including reopening an all-packed list", () => {
    const controller = controllerFor("filled");
    const read = () =>
      readComponent(
        components.PackingList,
        packing,
        "p1",
        "filled",
        Object.fromEntries(
          Object.entries(controller.store.snapshot("home")).map(([address, value]) => [
            address.slice("home/".length),
            value,
          ]),
        ),
      ).join("\n");
    expect(controller.press("home/p1/r1/packed_3").ok).toBe(false);
    expect(controller.press("home/p1/r1/packed_2").ok).toBe(true);
    expect(read()).toContain("67%");
    expect(controller.press("home/p1/r2/packed_1").ok).toBe(true);
    expect(read()).toContain("All packed 100%");
    expect(controller.press("home/p1/r1/packed_2").ok).toBe(true);
    expect(read()).toContain("[p1/r1/packed_2 check:todo]");
    expect(read()).toContain("67%");
    controller.dispose();
  });
  it.each(["filled", "empty", "success"] as const)("types into add in %s", (state) => {
    const controller = controllerFor(state);
    const parts = addressedElements(renderInstance("PackingList", packing, state, theme, { thing: "item" }));
    const read = readComponent(components.PackingList, packing, "p1", state).join("\n");
    expect(parts.get("home/c1/add")?.attributes).toContain('aria-label="Add an item"');
    expect(parts.get("home/c1/add_label")?.text).toContain("Add an item");
    expect(read).toContain("[p1/add type]");
    expect(controller.edit("home/p1/add", "Passport").ok).toBe(true);
    expect(controller.store.get("home/p1/add")).toBe("Passport");
    if (state !== "filled") {
      expect(parts.get("home/c1/progress")?.text).toContain(
        state === "empty" ? "No items yet" : "All packed",
      );
      expect(affordancesOf(meta, stampItemIds(meta, props.parse(packing)), "p1", {}, state)).toEqual([added]);
      expect(parts.has("home/c1/r1/root")).toBe(false);
      expect(controller.press("home/p1/r1/packed_1").ok).toBe(false);
    }
    controller.dispose();
  });
});
