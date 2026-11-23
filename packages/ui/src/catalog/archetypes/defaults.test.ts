import { describe, expect, it } from "vitest";
import {
  archetypes,
  components,
  createRegistry,
  checkScreen,
  readScreen,
  type ArchetypeName,
  type CastLike,
  packComposition,
  defaultLines,
  scoreComposition,
  type CoreArchetypeMeta,
} from "@lmthing/ui/catalog";
import { renderInstance } from "../../../test/render";
const layouts = Object.entries(archetypes).flatMap(([id, def]) =>
  Object.keys(def.meta.layouts).map((layout) => [id as ArchetypeName, layout] as const),
);
const casts: CastLike[] = [
  { things: [], items: [] },
  {
    things: [{ type: "plant", fields: ["name", "room", "water_every"] }],
    items: [
      { id: "fern", type: "plant", sample: true, name: "Fern", room: "Bathroom", water_every: 7 },
      { id: "basil", type: "plant", sample: true, name: "Basil", room: "Kitchen", water_every: 3 },
      { id: "monstera", type: "plant", sample: true, name: "Monstera", room: "Living room", water_every: 10 },
    ],
  },
];
describe("core archetype defaults", () => {
  it("provides all seventeen archetypes and a compose probe for every layout", () => {
    expect(Object.keys(archetypes)).toHaveLength(17);
    for (const def of Object.values(archetypes)) {
      expect(def.probes.map((probe) => probe.layout)).toEqual(Object.keys(def.meta.layouts));
      expect(def.probes.every((probe) => probe.kind === "compose")).toBe(true);
    }
  });
  it.each(layouts)("%s/%s validates and renders with empty and real casts", (id, layout) => {
    const registry = createRegistry();
    for (const cast of casts) {
      const screen = registry.defaultLines(id, layout, cast);
      expect(checkScreen(screen, registry)).toEqual([]);
      expect(new Set(screen.components.map((entry) => entry.id)).size).toBe(screen.components.length);
      expect(readScreen(screen, components)).toContain(`screen ${screen.id}`);
      for (const { id: _id, c, state: _state, ...input } of screen.components)
        expect(
          renderInstance(
            c as keyof typeof components,
            input,
            "filled",
            { preset: "calm", mode: "light", accent: "moss" },
            { resolvePhoto: (reference) => reference },
          ),
        ).toContain('data-testid="home/c1/root"');
    }
  });
  it("uses reply, writing and price choices in the updated recipes", () => {
    const registry = createRegistry(),
      cast = casts[1]!;
    expect(registry.defaultLines("chat", "thread", cast).components.at(-1)).toMatchObject({
      c: "Composer",
      style: "reply",
    });
    expect(
      registry
        .defaultLines("journal", "write", cast)
        .components.some((entry) => entry.c === "Composer" && entry.style === "entry"),
    ).toBe(true);
    const plans = registry
      .defaultLines("plans", "plans", cast)
      .components.find((entry) => entry.c === "Choice")!;
    expect((plans.options as { value?: string }[]).every((option) => option.value)).toBe(true);
  });
});

describe("optional task actions", () => {
  it.each(layouts.filter(([id]) => ["home", "list", "detail", "success"].includes(id)))(
    "%s/%s permits a screen-owned action but does not fill one",
    (id, layout) => {
      const registry = createRegistry();
      expect(archetypes[id].meta.layouts[layout]!.slots.at(-1)).toMatchObject({
        allow: ["Button"],
        min: 0,
        max: 1,
      });
      for (const cast of casts) {
        const screen = registry.defaultLines(id, layout, cast);
        expect(screen.components.map(({ c }) => c)).not.toContain("Button");
        expect(
          checkScreen(
            { ...screen, components: [...screen.components, { c: "Button", id: "btn", label: "Save" }] },
            registry,
          ),
        ).toEqual([]);
      }
    },
  );
});

it("keeps each shelf thumbnail with its source record, even when earlier records are skipped", () => {
  const cast: CastLike = {
    things: [{ type: "plant", fields: ["name"] }],
    items: [
      { id: "dog", type: "dog", sample: true, name: "Clover", photo: "lib:dogs" },
      { id: "untitled", type: "plant", sample: true, photo: "lib:plants" },
      { id: "fern", type: "plant", sample: true, name: "Fern", photo: "lib:fern" },
      { id: "basil", type: "plant", sample: true, name: "Basil", photo: "lib:basil" },
    ],
  };
  const screen = createRegistry().defaultLines("browse", "shelves", cast);
  for (const shelf of screen.components.filter((entry) => entry.c === "List")) {
    expect(shelf.style).toBe("shelf");
    expect(shelf.rows).toEqual([
      { title: "Fern", photo: "lib:fern" },
      { title: "Basil", photo: "lib:basil" },
    ]);
  }
});

it("accepts text-first browsing with only the supplied media and detail notes without any media", () => {
  const registry = createRegistry();
  const cast = {
    ...casts[1]!,
    items: casts[1]!.items.map((item, index) => (index === 1 ? { ...item, photo: "lib:basil" } : item)),
  };
  const browse = registry.defaultLines("browse", "shelves", cast);
  for (const list of browse.components.filter((entry) => entry.c === "List")) {
    expect(list).toMatchObject({
      lead: "thumb",
      rows: [{ title: "Fern" }, { title: "Basil", photo: "lib:basil" }, { title: "Monstera" }],
    });
    expect((list.rows as { photo?: string }[]).map((row) => row.photo)).toEqual([
      undefined,
      "lib:basil",
      undefined,
    ]);
    expect(list.style).toBeUndefined();
  }
  expect(
    scoreComposition(JSON.stringify(browse), archetypes.browse.meta, "shelves", components).issues,
  ).toEqual([]);
  const detail = registry.defaultLines("detail", "media", cast);
  expect(detail.components.map(({ c }) => c)).toEqual(["Header", "Note", "KeyValue"]);
  expect(
    scoreComposition(JSON.stringify(detail), archetypes.detail.meta, "media", components).issues,
  ).toEqual([]);
  const withImage = registry.defaultLines("detail", "media", { ...cast, items: [cast.items[1]!] });
  expect(withImage.components[1]).toMatchObject({ c: "Photo", photo: "lib:basil" });
  expect(
    scoreComposition(JSON.stringify(withImage), archetypes.detail.meta, "media", components).issues,
  ).toEqual([]);
});

const barsDefault: CoreArchetypeMeta = {
  id: "bars_default",
  purpose: "Compare amounts",
  layouts: {
    share: {
      slots: [
        { id: "header", allow: ["Header"], min: 1, max: 1 },
        { id: "bars", allow: ["Bars"], min: 1, max: 1, variant: "share" },
        { id: "note", allow: ["Note"], min: 1, max: 1 },
      ],
    },
  },
  defaults: { share: [{ c: "Header" }, { c: "Bars", variant: "share" }, { c: "Note" }] },
};

it("trims Bars/share neutral and full-cast fallbacks to the schema's six-part limit without changing core Bars", () => {
  const cast: CastLike = {
    things: [{ type: "category", fields: ["name", "amount"] }],
    items: Array.from({ length: 7 }, (_, index) => ({
      id: `item_${index}`,
      type: "category",
      sample: true,
      name: `C${index}`,
      amount: index + 1,
    })),
  };
  for (const source of [casts[0]!, cast]) {
    const fallback = components.Bars.fallback({ cast: source });
    expect(fallback.points).toHaveLength(7);
    const screen = defaultLines(barsDefault, "share", source, components);
    const { id: _id, c: _c, ...input } = screen.components[1]!;
    expect(input.points).toEqual(fallback.points.slice(0, 6));
    expect(components.Bars.props.safeParse(input).success).toBe(true);
    expect(checkScreen(screen, components)).toEqual([]);
    expect(fallback.points).toHaveLength(7);
  }
});

it("applies the same style bound to a pack seed and preserves already valid fallback data", () => {
  const meta = packComposition({
    id: "seed",
    job: "Compare category amounts",
    defaultLayout: "share",
    layouts: {
      share: {
        recipe: [
          { allow: ["Header"], required: true },
          { allow: ["Bars"], required: true, variant: "share" },
          { allow: ["Note"], required: true },
        ],
        defaults: [
          { id: "h1", c: "Header" },
          { id: "b1", c: "Bars", style: "share" },
          { id: "n1", c: "Note" },
        ],
      },
    },
  });
  expect(defaultLines(meta, "share", casts[0]!, components).components[1]!.points).toHaveLength(6);
  const full = components.Bars.fallback({ cast: casts[1]! });
  expect(defaultLines(meta, "share", casts[1]!, components).components[1]!.points).toEqual(full.points);
  const columns = { ...barsDefault, defaults: { share: [{ c: "Header" }, { c: "Bars" }, { c: "Note" }] } };
  expect(defaultLines(columns, "share", casts[0]!, components).components[1]!.points).toHaveLength(7);
});

it("does not hide invalid row content, unrelated props or too-few items by trimming", () => {
  const valid = components.Bars.fallback({ cast: casts[0]! });
  const invalid = [
    { ...valid, title: "x".repeat(33) },
    { ...valid, points: [...valid.points.slice(0, 6), { label: "Bad", value: -1 }] },
    { ...valid, points: [] },
  ];
  for (const input of invalid) {
    const snapshot = JSON.stringify(input);
    const defs = { ...components, Bars: { ...components.Bars, fallback: () => input } };
    expect(() => defaultLines(barsDefault, "share", casts[0]!, defs)).toThrow();
    expect(JSON.stringify(input)).toBe(snapshot);
  }
});
