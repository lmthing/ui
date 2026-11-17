import { describe, expect, expectTypeOf, it } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  readComponent,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { renderInstance } from "../../test/render";

const { props, meta, examples, fallback, probes } = components.Steps;

describe("Steps schema", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("applies defaults, trims text and derives a meaningful label", () => {
    expect(props.parse({ count: 3, at: 1 })).toEqual({
      style: "dots",
      count: 3,
      at: 1,
      label: "Step 1 of 3",
    });
    expect(props.parse({ count: 3, at: 2, label: "  Add your first plant  " }).label).toBe(
      "Step 2 of 3 · Add your first plant",
    );
  });
  it.each([
    {},
    { count: 3 },
    { at: 1 },
    { count: 1, at: 1 },
    { count: 7, at: 1 },
    { count: 2.5, at: 1 },
    { count: "3", at: 1 },
    { count: 3, at: 0 },
    { count: 3, at: 4 },
    { count: 3, at: 1.5 },
    { count: 3, at: "1" },
    { count: 3, at: 1, label: "" },
    { count: 3, at: 1, label: "   " },
    { count: 3, at: 1, label: "a".repeat(33) },
    { count: 3, at: 1, label: 4 },
    { count: 3, at: 1, style: "ring" },
    { count: 3, at: 1, color: "red" },
    { count: 3, at: 1, pixels: 4 },
    { count: 3, at: 1, id: "s1" },
    { count: 3, at: 1, goto: "next" },
  ])("rejects invalid input", (input) => expect(props.safeParse(input).success).toBe(false));
  it("accepts every valid position at both count limits and the exact label limit", () => {
    for (const count of [2, 6]) {
      for (let at = 1; at <= count; at++) {
        expect(props.safeParse({ count, at, label: "a".repeat(32) }).success).toBe(true);
      }
      expect(props.safeParse({ count, at: count + 1 }).success).toBe(false);
    }
  });
  it("infers view props without ids, actions or raw visual values", () => {
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["count"]>().toEqualTypeOf<number>();
    expectTypeOf<ViewProps["at"]>().toEqualTypeOf<number>();
    expectTypeOf<ViewProps["style"]>().toEqualTypeOf<"dots" | "bar" | "numbered">();
    expectTypeOf<ViewProps>().not.toBeAny();
    expectTypeOf<ViewProps>().not.toHaveProperty("id");
    expectTypeOf<ViewProps>().not.toHaveProperty("color");
  });
});

describe("Steps fallback", () => {
  it("keeps the same neutral initial position for empty, full, mixed and malformed casts", () => {
    const casts: CastLike[] = [
      { things: [], items: [] },
      {
        things: [{ type: "plant", fields: ["name", "room"] }],
        items: [{ id: "fern", type: "plant", sample: true, name: "Fern", room: "Bathroom" }],
      },
      {
        things: [],
        items: [
          { id: "dog", type: "dog", sample: true, title: "Clover" },
          { id: "plant", type: "plant", sample: true, name: "Fern" },
        ],
      },
      { things: [], items: [{ id: "fern", type: "plant", sample: true, name: 4 }] },
    ];
    for (const cast of casts) {
      expect(fallback({ cast })).toEqual({ count: 3, at: 1 });
      expect(props.safeParse(fallback({ cast })).success).toBe(true);
      expect(props.parse(fallback({ cast })).label).toBe("Step 1 of 3");
    }
  });
});

describe("Steps metadata and probes", () => {
  it("has the required contract and well-formed choose and write probes", () => {
    expect(meta).toMatchObject({ id: "Steps", group: "structure", region: "top", weight: 1, tier: "phone" });
    expect(meta.parts).toEqual(["root", "track", "label"]);
    expect(meta.states).toEqual(["filled"]);
    expect(meta).not.toHaveProperty("actions");
    expect(meta).not.toHaveProperty("items");
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain("Checklist");
    expect(meta.pick).toContain("Ring");
    expect(meta.aliases.length).toBeGreaterThanOrEqual(3);
    expect(meta.aliases.length).toBeLessThanOrEqual(5);
    expect(probes.filter((probe) => probe.kind === "choose")).toHaveLength(2);
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "Checklist")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "Steps" });
    for (const probe of probes) {
      const wording = probe.kind === "choose" ? probe.need : probe.brief;
      for (const name of [meta.id, ...meta.aliases]) {
        expect(wording.toLowerCase()).not.toMatch(new RegExp(`\\b${name.toLowerCase()}\\b`));
      }
    }
  });
  it("builds a data-only registry with case and separator tolerant aliases", () => {
    const registry = createRegistry();
    expect(registry.ids).toContain("Steps");
    expect(registry.schema("Steps")).toBe(props);
    expect(registry.resolve("step-per")).toBe("Steps");
    expect(registry.resolve("WIZARD")).toBe("Steps");
    expect(registry.resolve("unknown")).toBeUndefined();
  });
});

describe("Steps view and reading", () => {
  it.each(["dots", "bar", "numbered"] as const)(
    "draws an addressed decorative %s track and reads the current place without actions",
    (style) => {
      for (const count of [2, 6]) {
        for (let at = 1; at <= count; at++) {
          for (const label of [undefined, "Add your first plant", "a".repeat(32)]) {
            const input = { style, count, at, label };
            const parsed = props.parse(input);
            const read = readComponent(components.Steps, input, "c1").join("\n");
            const html = renderInstance("Steps", input, "filled", {
              preset: "calm",
              mode: "light",
              accent: "moss",
            });
            expect(read).toContain(`Step ${at} of ${count}`);
            expect(read).toContain(parsed.label);
            expect(html).toContain(parsed.label);
            expect(html.match(/data-testid="home\/c1\/root"/g)).toHaveLength(1);
            expect(html.match(/data-testid="home\/c1\/label"/g)).toHaveLength(1);
            const track = html.match(/<[^>]*data-testid="home\/c1\/track"[^>]*>/)?.[0];
            expect(track).toContain('aria-hidden="true"');
            expect(affordancesOf(meta, parsed, "c1")).toEqual([]);
            expect(read).not.toContain("[c1/track");
          }
        }
      }
    },
  );
});
