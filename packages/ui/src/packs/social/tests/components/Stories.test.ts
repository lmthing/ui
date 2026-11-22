import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  components,
  createRegistry,
  packReady,
  readComponent,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";

const def = components.Stories;
const { meta, props, fallback, examples, probes } = def;
const example = examples[0]!;
const person = example.people[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const parts = (input: unknown, state: "filled" | "empty" = "filled") =>
  addressedElements(renderInstance("Stories", input, state, theme, { component: "s1" }));

describe("Stories schema", () => {
  it.each(examples)("parses the domain example", (input) => {
    expect(props.safeParse(input).success).toBe(true);
  });
  it("trims names, applies defaults, and accepts exact bounds and both photo forms", () => {
    const parsed = props.parse({ mine: true, people: [{ ...person, name: "  Maya " }] });
    expect(parsed).not.toHaveProperty("density"); // inherits the phone's setting
    expect(parsed).toMatchObject({
      detail: "full",
      people: [{ ...person, name: "Maya" }],
    });
    const row = { ...person, name: "x".repeat(12), photo: "local:1", goto: "x".repeat(64) };
    expect(props.safeParse({ mine: false, people: Array(10).fill(row) }).success).toBe(true);
    expectTypeOf<Props<typeof props, typeof meta>["people"][number]["id"]>().toEqualTypeOf<string>();
  });
  // prettier-ignore
  it.each([
    {}, { people: [person] }, { mine: false }, { ...example, mine: "true" },
    { ...example, people: [] }, { ...example, people: Array(11).fill(person) },
    { ...example, detail: "hidden" }, { ...example, surface: "tinted" }, { ...example, color: "red" },
    ...[
      { name: " " }, { name: "x".repeat(13) }, { photo: "https://example.org/photo" },
      { photo: "lib:" }, { seen: "false" }, { goto: "Bad ID" }, { goto: "x".repeat(65) },
      { goto: undefined }, { id: "r1" }, { ring: "accent" },
    ].map((patch) => ({ mine: true, people: [{ ...person, ...patch }] })),
  ])("rejects invalid wire input", (input) => {
    expect(props.safeParse(input).success).toBe(false);
  });
});

describe("Stories fallback and metadata", () => {
  it("uses cast names and IDs with bounded neutral placeholders for absent fields", () => {
    const empty: CastLike = { things: [], items: [] };
    const things = [{ type: "entry", fields: ["heading"] }];
    const matching: CastLike = {
      things,
      items: Array.from({ length: 5 }, (_, index) => ({
        id: `entry_${index}`,
        type: "entry",
        sample: true,
        heading: "x".repeat(18),
      })),
    };
    const malformed: CastLike = {
      things,
      items: [{ id: "Bad ID", type: "entry", sample: true, heading: 99 }],
    };
    const neutral = {
      people: [{ name: "Item one", photo: "lib:people", seen: false, goto: "story" }],
      mine: false,
    };
    expect(fallback({ cast: empty })).toEqual(neutral);
    expect(fallback({ cast: malformed })).toEqual(neutral);
    expect(fallback({ cast: matching }).people).toHaveLength(3);
    expect(fallback({ cast: matching }).people[0]).toEqual({
      ...neutral.people[0],
      name: "x".repeat(12),
      goto: "entry_0",
    });
    for (const cast of [empty, matching, malformed])
      expect(props.safeParse(fallback({ cast })).success).toBe(true);
  });
  it("retains the pack gate, tiers, and core-first, write and read probes", () => {
    expect(meta).toMatchObject({
      status: "ready",
      tier: "people",
      partTiers: { add: "ok" },
      dense: true,
      weight: 3,
    });
    expect(createRegistry({ packs: ["social"], includeDrafts: true }).schema("Stories")).toBe(props);
    expect(createRegistry({ packs: ["social"] }).ids.includes("Stories")).toBe(packReady("social"));
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "choose", expect: "Stories" }),
        expect.objectContaining({ kind: "choose", expect: "People" }),
        expect.objectContaining({ kind: "write", expect: "Stories" }),
        expect.objectContaining({
          kind: "write",
          variant: { axis: "detail", value: "brief", itemTitles: ["Maya", "Sam"] },
        }),
        expect.objectContaining({ kind: "read", expect: { address: "s1/add", action: "press" } }),
      ]),
    );
  });
});

describe("Stories states, parts and read", () => {
  it("places the add button first and distinguishes unseen from seen stories", () => {
    const drawn = parts(example);
    expect([...drawn.keys()].indexOf("home/s1/add")).toBeLessThan(
      [...drawn.keys()].indexOf("home/s1/r1/root"),
    );
    expect(drawn.get("home/s1/add")?.attributes).toContain('role="button"');
    expect(drawn.get("home/s1/add")?.attributes).toContain('aria-label="Add your story"');
    expect(drawn.get("home/s1/r1/root")?.attributes).toContain('role="link"');
    expect(drawn.get("home/s1/r1/photo")?.attributes).toContain('aria-label="Maya: new story"');
    expect(drawn.get("home/s1/r2/photo")?.attributes).toContain('aria-label="Sam: seen story"');
    expect(drawn.get("home/s1/r1/name")?.text).toEqual(["Maya"]);
    const read = readComponent(def, example, "s1").join("\n");
    expect(read).toContain("Maya: new story");
    expect(read).toContain("Sam: seen story");
    expect(read).toContain("[s1/add press !needs-ok]");
    expect(read).toContain("[s1/r1 press→fern_story !needs-people]");
  });
  it("keeps finish addresses stable and hides only captions in brief", () => {
    const full = [...parts(example).keys()];
    expect([...parts({ ...example }).keys()]).toEqual(full);
    const brief = { ...example, detail: "brief" };
    expect([...parts(brief).keys()]).toEqual(full.filter((part) => !/\/(?:add_label|name)$/.test(part)));
    expect(props.parse(brief).people[0]?.name).toBe("Maya");
    expect(readComponent(def, brief, "s1").join("\n")).toContain("[s1/r1 press→fern_story");
  });
  it("adds a scrolling region only to long rails without hiding any links", () => {
    expect(parts(example).has("home/s1/scroll")).toBe(false);
    const crowded = { ...example, people: Array(10).fill(person) };
    const drawn = parts(crowded);
    expect(drawn.has("home/s1/scroll")).toBe(true);
    expect(drawn.get("home/s1/r10/root")?.attributes).toContain('role="link"');
    expect(readComponent(def, crowded, "s1").join("\n")).toContain("[s1/r10 press→fern_story");
  });
  it.each([true, false])("has an intentional empty state and keeps add conditional (mine=%s)", (mine) => {
    const input = { ...example, mine };
    const drawn = parts(input, "empty");
    expect(drawn.get("home/s1/empty")?.text).toEqual(["No stories yet"]);
    expect([...drawn.keys()].some((key) => key.includes("/r1/"))).toBe(false);
    expect(drawn.has("home/s1/add")).toBe(mine);
    expect(readComponent(def, input, "s1", "empty").join("\n").includes("[s1/add press")).toBe(mine);
    expect(readComponent(def, input, "s1", "empty").join("\n")).not.toContain("fern_story");
    expect(parts(input).has("home/s1/add")).toBe(mine);
  });
});

describe("Stories controller", () => {
  it.each([
    ["filled", true],
    ["filled", false],
    ["empty", true],
    ["empty", false],
  ] as const)("dispatches only valid actions in %s with mine=%s", (state, mine) => {
    const screen = { id: "home", components: [{ ...example, mine, state, id: "s1", c: "Stories" }] };
    const onAction = vi.fn();
    const onLink = vi.fn();
    const runtime = createScreenController({ screen, defs: components, onAction, onLink });
    try {
      expect(runtime.press("s1/add").ok).toBe(mine);
      expect(runtime.press("s1/add_icon").ok).toBe(false);
      expect(runtime.press("s1/r1/photo").ok).toBe(false);
      expect(runtime.press("s1/r2").ok).toBe(state === "filled");
      expect(onAction.mock.calls.map(([event]) => event)).toEqual([
        ...(mine ? [{ address: "home/s1/add", action: "press" }] : []),
        ...(state === "filled" ? [{ address: "home/s1/r2", action: "press" }] : []),
      ]);
      expect(onLink.mock.calls).toEqual(state === "filled" ? [["basil_story", "home/s1/r2"]] : []);
      expect(runtime.confirmation).toBeUndefined();
    } finally {
      runtime.dispose();
    }
  });
});
