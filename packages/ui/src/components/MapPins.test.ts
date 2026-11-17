import { describe, expect, expectTypeOf, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createTamagui, createTokens, TamaguiProvider } from "tamagui";
import {
  affordancesOf,
  components,
  createRegistry,
  readComponent,
  stampItemIds,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { KitProvider, PartScope, kitFonts, kitThemes, kitTokens, renderers } from "@lmthing/ui/kit";

const { props, meta, examples, fallback, probes } = components.MapPins;
const config = createTamagui({
  tokens: createTokens(kitTokens),
  fonts: kitFonts,
  themes: kitThemes,
  defaultFont: "humanist",
});

describe("MapPins schema", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("trims labels without inventing navigation", () => {
    expect(props.parse({ pins: [{ label: "  First place  " }] })).toEqual({
      pins: [{ label: "First place", root: undefined }],
    });
  });
  it.each([
    {},
    { pins: [] },
    { pins: Array.from({ length: 6 }, () => ({ label: "Place" })) },
    ...["", "   ", "a".repeat(25), 4].map((label) => ({ pins: [{ label }] })),
    ...["Bad ID", "", "a".repeat(65), 4].map((goto) => ({ pins: [{ label: "Place", goto }] })),
    { pins: [{}] },
    { pins: [{ label: "Place", id: "r1" }] },
    { pins: [{ label: "Place", root: "place" }] },
    { pins: [{ label: "Place", color: "red" }] },
    { pins: [{ label: "Place", pixels: 4 }] },
    { pins: [{ label: "Place" }], style: "satellite" },
    { pins: [{ label: "Place" }], color: "red" },
  ])("rejects invalid input", (input) => expect(props.safeParse(input).success).toBe(false));
  it("accepts exact maximum lengths and count, repeated labels and navigation forms", () => {
    const pin = { label: "a".repeat(24), goto: "a".repeat(64) };
    expect(props.safeParse({ pins: Array.from({ length: 5 }, () => pin) }).success).toBe(true);
    for (const goto of ["back", "place_details"])
      expect(props.safeParse({ pins: [{ label: "Place", goto }] }).success).toBe(true);
  });
  it("adds validator item ids only to view props", () => {
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["pins"][number]["id"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps["pins"][number]["label"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps>().not.toBeAny();
    expectTypeOf<ViewProps>().not.toHaveProperty("color");
  });
});

describe("MapPins actions", () => {
  it("offers press only for pins with navigation, including mixed rows", () => {
    for (const goto of [undefined, "place", "back", "place_details"]) {
      const pins = stampItemIds(
        meta,
        props.parse({
          pins: [{ label: "First place", goto }, { label: "Second place" }],
        }),
      );
      expect(affordancesOf(meta, pins, "m1")).toEqual(
        goto ? [{ address: "m1/r1", part: "root", action: "press", detail: `→${goto}` }] : [],
      );
    }
  });
});
describe("MapPins fallback", () => {
  it("validates empty, matching, mixed, long and malformed casts with neutral placeholders", () => {
    const casts: CastLike[] = [
      { things: [], items: [] },
      {
        things: [{ type: "place", fields: ["name"] }],
        items: [{ id: "first", type: "place", sample: true, name: "First place" }],
      },
      {
        things: [],
        items: [
          { id: "first", type: "place", sample: true, title: "First place" },
          { id: "other", type: "other", sample: true, name: "Excluded" },
        ],
      },
      {
        things: [{ type: "place", fields: ["name"] }],
        items: Array.from({ length: 8 }, (_, index) => ({
          id: `place_${index}`,
          type: "place",
          sample: false,
          name: "x".repeat(80),
        })),
      },
      { things: [], items: [{ id: "bad", type: "place", sample: true, name: 4 }] },
    ];
    for (const cast of casts) expect(props.safeParse(fallback({ cast })).success).toBe(true);
    expect(fallback({ cast: casts[0]! }).pins).toEqual([
      { label: "Item one" },
      { label: "Item two" },
      { label: "Item three" },
    ]);
    expect(fallback({ cast: casts[1]! }).pins).toEqual([{ label: "First place" }]);
    expect(fallback({ cast: casts[2]! }).pins).toEqual([{ label: "First place" }]);
    expect(fallback({ cast: casts[3]! }).pins).toEqual(
      Array.from({ length: 3 }, () => ({ label: "x".repeat(24) })),
    );
    expect(fallback({ cast: casts[4]! })).toEqual(fallback({ cast: casts[0]! }));
  });
});
describe("MapPins metadata", () => {
  it("declares the contract and well-formed choose, write and read probes", () => {
    expect(meta).toMatchObject({
      id: "MapPins",
      group: "data",
      region: "body",
      weight: 3,
      tier: "service",
      items: { key: "pins", parts: ["root", "label"] },
      parts: ["root", "map"],
      states: ["filled", "loading"],
      actions: { items: { root: ["press"] } },
    });
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    for (const near of ["Route", "List"]) expect(meta.pick).toContain(near);
    expect(probes.filter((probe) => probe.kind === "choose")).toHaveLength(2);
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "Route")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "MapPins" });
    expect(probes.find((probe) => probe.kind === "read")).toMatchObject({
      screen: 1,
      task: "Open the park gate",
      expect: { address: "m1/r1", action: "press" },
    });
  });
  it("reads matching numbers, names and actions, but no stale content while loading", () => {
    const input = { pins: [{ label: "First place", goto: "first" }, { label: "Second place" }] };
    const read = readComponent(components.MapPins, input, "m1").join("\n");
    expect(read).toContain("r1: 1 First place");
    expect(read).toContain("r2: 2 Second place");
    expect(read).toContain("[m1/r1 press→first !needs-service]");
    expect(read).not.toContain("[m1/r2 press");
    expect(readComponent(components.MapPins, input, "m1", "loading")).toEqual(["m1 MapPins (loading)"]);
  });
  it("is registered automatically with tolerant aliases", () => {
    const registry = createRegistry();
    expect(registry.ids).toContain("MapPins");
    expect(registry.schema("MapPins")).toBe(props);
    expect(registry.resolve("NEAR-BY")).toBe("MapPins");
  });
});
describe("MapPins rendering", () => {
  it.each([1, 2, 3, 4, 5])(
    "draws %i distinct row roots with matching numbers and mixed navigation",
    (count) => {
      const input = {
        pins: Array.from({ length: count }, (_, index) => ({
          label: "Repeated place",
          ...(index % 2 === 0 ? { goto: "place" } : {}),
        })),
      };
      const viewProps = stampItemIds(meta, props.parse(input)) as Props<typeof props, typeof meta>;
      for (const state of ["filled", "loading"] as const) {
        const children = createElement(PartScope, {
          screen: "home",
          component: "m1",
          rev: 1,
          state,
          children: createElement(renderers.MapPins, viewProps),
        });
        const kit = createElement(KitProvider, {
          theme: { preset: "calm", mode: "light", accent: "moss" },
          children,
        });
        const html = renderToStaticMarkup(createElement(TamaguiProvider, { config }, kit));
        expect(html.match(/data-testid="home\/m1\/root"/g)).toHaveLength(1);
        expect(html).toContain('data-testid="home/m1/map"');
        expect(html.includes("Repeated place")).toBe(state === "filled");
        expect(html.match(/<svg\b/g) ?? []).toHaveLength(state === "filled" ? Math.ceil(count / 2) : 0);
        for (let index = 1; index <= count; index++) {
          for (const part of ["root", "label"]) {
            const matches = html.match(new RegExp(`data-testid="home/m1/r${index}/${part}"`, "g")) ?? [];
            expect(matches).toHaveLength(state === "filled" ? 1 : 0);
          }
          if (state === "filled") {
            expect(html).toContain(`>${index}</span>`);
            const tag = html.match(new RegExp(`<[^>]*data-testid="home/m1/r${index}/root"[^>]*>`))![0];
            expect(tag).toContain(`role="${index % 2 === 1 ? "link" : "listitem"}"`);
          }
        }
      }
    },
  );
});
