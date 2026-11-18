import { describe, expect, it } from "vitest";
import {
  archetypes,
  components,
  createRegistry,
  checkScreen,
  readScreen,
  type ArchetypeName,
  type CastLike,
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
          renderInstance(c as keyof typeof components, input, "filled", {
            preset: "calm",
            mode: "light",
            accent: "moss",
          }),
        ).toContain('data-testid="home/c1/root"');
    }
  });
  it("uses reply, writing, price choices and shelves in the updated recipes", () => {
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
    expect(
      registry
        .defaultLines("browse", "shelves", cast)
        .components.filter((entry) => entry.c === "List" && entry.style === "shelf"),
    ).toHaveLength(2);
  });
});
