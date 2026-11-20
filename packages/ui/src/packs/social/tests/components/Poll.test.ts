import { describe, expect, expectTypeOf, it } from "vitest";
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

const def = components.Poll;
const { meta, props, examples, fallback, probes } = def;
const example = examples[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const parts = (input: unknown, state: "filled" | "success" = "filled") =>
  addressedElements(renderInstance("Poll", input, state, theme, { component: "p1" }));
const read = (input: unknown, state: "filled" | "success" = "filled") =>
  readComponent(def, input, "p1", state).join("\n");

describe("Poll schema", () => {
  it.each(examples)("parses the domain example", (input) => {
    expect(props.safeParse(input).success).toBe(true);
  });
  it("trims text, applies defaults, and preserves the wire bounds", () => {
    expect(props.parse({ ...example, question: "  Pick one  " })).toMatchObject({
      question: "Pick one",
      surface: "card",
      emphasis: "normal",
      detail: "full",
    });
    const row = { label: "a".repeat(32), votes: 999999 };
    expect(props.safeParse({ question: "b".repeat(80), options: Array(5).fill(row), voted: 4 }).success).toBe(
      true,
    );
    type View = Props<typeof props, typeof meta>;
    expectTypeOf<View["options"][number]["id"]>().toEqualTypeOf<string>();
    expectTypeOf<View>().not.toBeAny();
  });
  // prettier-ignore
  it.each([
    {},
    ...[
      { question: " " }, { question: "a".repeat(81) },
      { options: example.options.slice(0, 1) }, { options: Array(6).fill(example.options[0]) },
      ...[{ label: "" }, { label: "a".repeat(33) }, { id: "r2" }, { share: 50 },
        { votes: -1 }, { votes: 1.5 }, { votes: 1000000 }].map((patch) => ({
          options: [example.options[0], { ...example.options[1], ...patch }],
        })),
      { voted: -1 }, { voted: 1.5 }, { voted: 2 }, { closes: "2026-02-30" },
      { detail: "none" }, { color: "red" }, { total: 7 }, { can_vote: true }, { live_vote: 1 },
    ].map((patch) => ({ ...example, ...patch })),
  ])("rejects invalid props", (input) => expect(props.safeParse(input).success).toBe(false));
});

describe("Poll fallback and metadata", () => {
  it("uses cast content or neutral placeholders and stays in bounds", () => {
    const empty: CastLike = { things: [], items: [] };
    const matching: CastLike = {
      things: [{ type: "entry", fields: ["name", "detail"] }],
      items: [{ id: "one", type: "entry", sample: true, name: "a".repeat(40), detail: "b".repeat(90) }],
    };
    const malformed: CastLike = {
      things: matching.things,
      items: [{ id: "bad", type: "entry", sample: true, name: 3, detail: 4 }],
    };
    const neutral = {
      question: "Continue",
      options: [
        { label: "Item one", votes: 0 },
        { label: "Item two", votes: 0 },
      ],
    };
    expect(fallback({ cast: empty })).toEqual(neutral);
    expect(fallback({ cast: malformed })).toEqual(neutral);
    expect(fallback({ cast: matching })).toEqual({
      question: "b".repeat(80),
      options: [{ label: "a".repeat(32), votes: 0 }, neutral.options[1]],
    });
    for (const cast of [empty, matching, malformed])
      expect(props.safeParse(fallback({ cast })).success).toBe(true);
  });
  it("keeps the people tier, pack gate, and core-first and variant probes", () => {
    expect(meta).toMatchObject({ status: "ready", tier: "people", weight: 2, states: ["filled", "success"] });
    expect(meta.pick).toContain("Choice");
    expect(meta.realPath).toContain("shared app");
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "choose", expect: "Poll" }),
        expect.objectContaining({ kind: "choose", expect: "Choice" }),
        expect.objectContaining({ kind: "write", expect: "Poll" }),
        expect.objectContaining({
          kind: "write",
          variant: expect.objectContaining({ axis: "detail", value: "brief" }),
        }),
        expect.objectContaining({ kind: "read", expect: { address: "p1/r2", action: "select" } }),
      ]),
    );
    expect(createRegistry({ packs: ["social"], includeDrafts: true }).schema("Poll")).toBe(props);
    expect(createRegistry({ packs: ["social"] }).ids.includes("Poll")).toBe(packReady("social"));
  });
});

describe("Poll states, parts and read", () => {
  it("shows vote buttons with stable item labels and hides results before voting", () => {
    const drawn = parts(example);
    expect(drawn.get("home/p1/question")?.text).toEqual([example.question]);
    expect(drawn.get("home/p1/r2/label")?.text).toEqual(["Basil"]);
    expect(drawn.get("home/p1/r2/root")?.attributes).toContain('role="button"');
    expect(drawn.get("home/p1/r2/root")?.attributes).toContain('aria-label="Vote for Basil"');
    expect(drawn.get("home/p1/closes")?.text.join("")).toMatch(/^Closes /);
    expect([...drawn.keys()].join(" ")).not.toMatch(/share|selected|total/);
    expect(read(example)).toContain("[p1/r2 select");
    expect(read(example)).toContain("!needs-people");
    expect(read(example)).not.toContain("Total");
  });
  it.each(["filled", "success"] as const)("shows the seeded vote as inert results in %s", (state) => {
    const input = { ...example, voted: 1 };
    const drawn = parts(input, state);
    expect(drawn.get("home/p1/r2/root")?.attributes).toContain('aria-label="Basil chosen"');
    expect(drawn.get("home/p1/r2/root")?.attributes).not.toContain('role="button"');
    expect(drawn.get("home/p1/r2/share")?.text).toEqual(["43%"]);
    expect(drawn.has("home/p1/r2/selected")).toBe(true);
    expect(drawn.has("home/p1/r1/selected")).toBe(false);
    expect(drawn.get("home/p1/total")?.text).toEqual(["Total 7 votes"]);
    expect(read(input, state)).toContain("Basil · 43%");
    expect(read(input, state)).not.toContain(" select");
  });
  it("draws explicit success without inventing a selection and keeps finish addresses stable", () => {
    const addresses = [...parts(example, "success").keys()];
    expect(addresses).toContain("home/p1/r1/share");
    expect(addresses.join(" ")).not.toContain("selected");
    expect([
      ...parts({ ...example, density: "compact", surface: "outlined", emphasis: "quiet" }, "success").keys(),
    ]).toEqual(addresses);
    expect(read(example, "success")).not.toContain(" select");
  });
  it("hides only the date in brief without discarding its stored value", () => {
    const input = { ...example, voted: 0 };
    const brief = { ...input, detail: "brief" };
    expect(props.parse(brief).closes).toBe(example.closes);
    expect([...parts(brief).keys()]).toEqual(
      [...parts(input).keys()].filter((id) => id !== "home/p1/closes"),
    );
    expect(read(brief)).not.toMatch(/Closes|2026/);
    expect(read(brief)).toContain("Total 7 votes");
    expect(parts(examples[1]).has("home/p1/closes")).toBe(false);
  });
});

describe("Poll controller", () => {
  it("casts exactly one vote and projects the same counts to the reader and view", () => {
    const screen = { id: "home", components: [{ ...example, c: "Poll", id: "p1" }] };
    const runtime = createScreenController({ screen, defs: components });
    try {
      expect(runtime.act({ address: "p1/r2", action: "select", value: 0 }).ok).toBe(false);
      expect(runtime.press("p1/r2/label").ok).toBe(false);
      expect(runtime.press("p1/r2").ok).toBe(true);
      expect(runtime.read()).toContain("Total 8 votes");
      expect(runtime.read()).toContain("Basil · 50%");
      expect(runtime.read()).not.toContain(" select");
      const projected = runtime.liveControls(meta, props.parse(example), "p1");
      expect(projected).toMatchObject({ voted: 1, can_vote: false, options: [{ votes: 4 }, { votes: 4 }] });
      expect(runtime.press("p1/r1").ok).toBe(false);
      expect(runtime.act({ address: "p1/r2", action: "select", value: 1 }).ok).toBe(false);
      expect(runtime.liveControls(meta, props.parse(example), "p1")).toEqual(projected);
      expect(runtime.confirmation).toBeUndefined();
    } finally {
      runtime.dispose();
    }
  });
  it.each([{ voted: 0 }, { state: "success" as const }])("blocks voting in result-only input %o", (patch) => {
    const screen = { id: "home", components: [{ ...example, ...patch, c: "Poll", id: "p1" }] };
    const runtime = createScreenController({ screen, defs: components });
    try {
      expect(runtime.press("p1/r1").ok).toBe(false);
      expect(runtime.read()).toContain("Total 7 votes");
      expect(runtime.read()).not.toContain(" select");
    } finally {
      runtime.dispose();
    }
  });
});
