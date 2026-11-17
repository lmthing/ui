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

const { props, meta, examples, fallback, probes } = components.Route;
const pair = [{ label: "First stop" }, { label: "Last stop" }];
const config = createTamagui({
  tokens: createTokens(kitTokens),
  fonts: kitFonts,
  themes: kitThemes,
  defaultFont: "humanist",
});

describe("Route schema", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("trims text without inventing distance or metadata", () => {
    expect(
      props.parse({
        stops: [{ label: " First stop ", meta: " Collect parcel " }, { label: " Last stop " }],
        distance: " 3.2 km ",
      }),
    ).toEqual({
      stops: [{ label: "First stop", meta: "Collect parcel" }, { label: "Last stop" }],
      distance: "3.2 km",
    });
    expect(props.parse({ stops: pair })).toEqual({ stops: pair });
  });
  it.each([
    {},
    { stops: [] },
    { stops: [pair[0]] },
    { stops: Array.from({ length: 7 }, () => pair[0]) },
    { stops: [{}, pair[1]] },
    ...["", "   ", "a".repeat(25), 4].map((label) => ({ stops: [{ label }, pair[1]] })),
    ...["", "   ", "a".repeat(17), 4].map((meta) => ({ stops: [{ ...pair[0], meta }, pair[1]] })),
    ...["", "   ", "a".repeat(13), 4].map((distance) => ({ stops: pair, distance })),
    { stops: [{ ...pair[0], id: "r1" }, pair[1]] },
    { stops: [{ ...pair[0], pixels: 4 }, pair[1]] },
    { stops: [{ ...pair[0], color: "red" }, pair[1]] },
    { stops: pair, style: "map" },
    { stops: pair, color: "red" },
  ])("rejects invalid input", (input) => expect(props.safeParse(input).success).toBe(false));
  it("accepts the exact maximum text lengths and item count", () => {
    const stop = { label: "a".repeat(24), meta: "a".repeat(16) };
    expect(
      props.safeParse({ stops: Array.from({ length: 6 }, () => stop), distance: "a".repeat(12) }).success,
    ).toBe(true);
  });
  it("adds validator item ids only to view props", () => {
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["stops"][number]["id"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps["stops"][number]["label"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps>().not.toBeAny();
    expectTypeOf<ViewProps>().not.toHaveProperty("color");
  });
});

describe("Route fallback", () => {
  it("uses two cast stops, filling missing usable items with neutral placeholders", () => {
    const casts: CastLike[] = [
      { things: [], items: [] },
      {
        things: [{ type: "place", fields: ["name", "detail"] }],
        items: [
          { id: "first", type: "place", sample: true, name: "First stop", detail: "Collect parcel" },
          { id: "last", type: "place", sample: true, name: "Last stop" },
        ],
      },
      {
        things: [],
        items: [
          { id: "first", type: "place", sample: true, name: "First stop" },
          { id: "other", type: "other", sample: true, name: "Excluded" },
        ],
      },
      {
        things: [{ type: "place", fields: ["name", "detail"] }],
        items: Array.from({ length: 8 }, (_, index) => ({
          id: `place_${index}`,
          type: "place",
          sample: false,
          name: "x".repeat(80),
          detail: "y".repeat(80),
        })),
      },
      { things: [], items: [{ id: "bad", type: "place", sample: true, name: 4 }] },
      {
        things: [],
        items: [
          { id: "bad", type: "place", sample: true, name: " " },
          { id: "last", type: "place", sample: true, name: "Last stop" },
        ],
      },
    ];
    for (const cast of casts) {
      expect(props.safeParse(fallback({ cast })).success).toBe(true);
      expect(fallback({ cast }).stops).toHaveLength(2);
    }
    expect(fallback({ cast: casts[0]! }).stops).toEqual([{ label: "Item one" }, { label: "Item two" }]);
    expect(fallback({ cast: casts[1]! }).stops).toEqual([
      { label: "First stop", meta: "Collect parcel" },
      { label: "Last stop" },
    ]);
    expect(fallback({ cast: casts[2]! }).stops[1]).toEqual({ label: "Item two" });
    expect(fallback({ cast: casts[3]! }).stops[0]).toEqual({ label: "x".repeat(24), meta: "y".repeat(16) });
    expect(fallback({ cast: casts[5]! }).stops[0]).toEqual({ label: "Last stop" });
  });
});
describe("Route metadata", () => {
  it("declares exactly its static parts, state and outside-service tier", () => {
    expect(meta).toMatchObject({
      id: "Route",
      group: "data",
      region: "body",
      weight: 2,
      tier: "service",
      items: { key: "stops", parts: ["root", "label"] },
      parts: ["root", "distance"],
      states: ["filled"],
    });
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta).not.toHaveProperty("actions");
    expect(affordancesOf(meta, stampItemIds(meta, props.parse({ stops: pair })), "c1")).toEqual([]);
  });
  it("reads stops in travel order with optional metadata and distance", () => {
    const input = { stops: [{ label: "First stop", meta: "Collect parcel" }, pair[1]], distance: "3.2 km" };
    const read = readComponent(components.Route, input, "c1").join("\n");
    for (const text of ["First stop", "Last stop", "Collect parcel", "3.2 km"]) expect(read).toContain(text);
    expect(read.indexOf("First stop")).toBeLessThan(read.indexOf("Last stop"));
  });
  it("has two choose probes including a named near miss and one write probe", () => {
    expect(probes.filter((probe) => probe.kind === "choose")).toHaveLength(2);
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "Route")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "Timeline")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "Route" });
    expect(probes.map((probe) => probe.kind)).not.toContain("read");
    expect(meta.pick).toContain("Timeline");
    expect(meta.pick).toContain("MapPins");
  });
  it("is found automatically through case and separator tolerant aliases", () => {
    const registry = createRegistry();
    expect(registry.ids).toContain("Route");
    expect(registry.schema("Route")).toBe(props);
    expect(registry.resolve("jour-ney")).toBe("Route");
  });
});

describe("Route rendering", () => {
  it("draws every allowed count with mixed metadata, optional distance and repeated labels", () => {
    for (let count = 2; count <= 6; count++) {
      for (const distance of [undefined, "3.2 km"]) {
        const input = {
          stops: Array.from({ length: count }, (_, i) => ({
            label: "Repeated stop",
            ...(i % 2 === 0 ? { meta: "Collect parcel" } : {}),
          })),
          ...(distance ? { distance } : {}),
        };
        const viewProps = stampItemIds(meta, props.parse(input)) as Props<typeof props, typeof meta>;
        const children = createElement(PartScope, {
          screen: "home",
          component: "c1",
          rev: 1,
          state: "filled",
          children: createElement(renderers.Route, viewProps),
        });
        const kit = createElement(KitProvider, {
          theme: { preset: "calm", mode: "light", accent: "moss" },
          children,
        });
        const html = renderToStaticMarkup(createElement(TamaguiProvider, { config }, kit));
        expect(html.match(/data-testid="home\/c1\/root"/g)).toHaveLength(1);
        expect(html.match(/<svg\b/g)).toHaveLength(1);
        expect(html.includes('data-testid="home/c1/distance"')).toBe(Boolean(distance));
        expect(html.match(/Collect parcel/g)).toHaveLength(Math.ceil(count / 2));
        for (let i = 1; i <= count; i++) {
          for (const part of ["root", "label"]) {
            expect(html.match(new RegExp(`data-testid="home/c1/r${i}/${part}"`, "g"))).toHaveLength(1);
          }
          expect(html).not.toContain(`data-testid="home/c1/r${i}/meta"`);
        }
      }
    }
  });
});
