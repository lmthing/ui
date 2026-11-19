import { describe, expect, expectTypeOf, it } from "vitest";
import {
  affordancesOf,
  components,
  placeholderDetail,
  readComponent,
  stampItemIds,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { elementAt, renderInstance } from "../../../../test/render";

const { props, meta, examples, fallback, probes } = components.CookSteps;
const step = { text: "Follow this instruction", uses: ["First", "Second"], minutes: 20 };
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;

describe("CookSteps schema and boundaries", () => {
  it.each(examples)("accepts a real example", (input) => {
    expect(props.safeParse(input).success).toBe(true);
  });
  it("trims text, applies defaults and derives navigation and timer presence", () => {
    expect(props.parse({ steps: [{ text: "  Instruction  " }] })).toEqual({
      steps: [{ text: "Instruction", uses: [] }],
      at: 1,
      canNext: false,
      canBack: false,
      timer: undefined,
    });
    expect(props.parse({ steps: [step, step], at: 2 })).toMatchObject({
      canNext: false,
      canBack: true,
      timer: { minutes: 20 },
    });
    expectTypeOf<Props<typeof props, typeof meta>>().not.toBeAny();
  });
  it.each([
    {},
    { steps: [] },
    { steps: Array.from({ length: 21 }, () => step) },
    ...[
      { text: "" },
      { text: " " },
      { text: "a".repeat(201) },
      { uses: [""] },
      { uses: [" "] },
      { uses: ["a".repeat(21)] },
      { uses: Array.from({ length: 5 }, () => "Item") },
      { minutes: 0 },
      { minutes: 0.09 },
      { minutes: 241 },
      { minutes: Infinity },
      { minutes: NaN },
      { minutes: "20" },
      { unknown: true },
      { id: "r1" },
      { color: "red" },
      { pixels: 4 },
    ].map((change) => ({ steps: [{ ...step, ...change }] })),
    ...[0, 1.5, 2, 21].map((at) => ({ steps: [step], at })),
    ...["canNext", "canBack", "timer", "unknown", "color"].map((key) => ({
      steps: [step],
      [key]: true,
    })),
  ])("rejects invalid or model-written derived values", (input) => {
    expect(props.safeParse(input).success).toBe(false);
  });
  it("accepts exact maximum lengths, counts and timer limits", () => {
    const max = { text: "a".repeat(200), uses: Array(4).fill("u".repeat(20)), minutes: 240 };
    expect(props.safeParse({ steps: Array(20).fill(max), at: 20 }).success).toBe(true);
    expect(props.safeParse({ steps: [{ text: "Wait", minutes: 0.1 }] }).success).toBe(true);
  });
});

describe("CookSteps fallback and contract", () => {
  it("validates empty, useful, mixed, malformed and long casts", () => {
    const casts: CastLike[] = [
      { things: [], items: [] },
      {
        things: [{ type: "record", fields: ["title"] }],
        items: [{ id: "one", type: "record", sample: true, title: "First instruction" }],
      },
      {
        things: [],
        items: [
          { id: "one", type: "record", sample: true, title: "First instruction" },
          { id: "two", type: "other", sample: true, title: "Other instruction" },
        ],
      },
      { things: [], items: [{ id: "one", type: "record", sample: true, title: 4 }] },
      {
        things: [{ type: "record", fields: ["title"] }],
        items: Array.from({ length: 8 }, (_, index) => ({
          id: `record_${index}`,
          type: "record",
          sample: false,
          title: "a".repeat(240),
        })),
      },
    ];
    for (const cast of casts) expect(props.safeParse(fallback({ cast })).success).toBe(true);
    expect(fallback({ cast: casts[0]! })).toEqual({
      steps: [{ text: placeholderDetail, uses: [] }],
      at: 1,
    });
    expect(fallback({ cast: casts[1]! }).steps[0]?.text).toBe("First instruction");
    expect(fallback({ cast: casts[4]! }).steps).toHaveLength(3);
  });
  it("keeps the core-first near miss, states, parts and phone tier", () => {
    expect(meta.status).toBe("ready");
    expect(meta.tier).toBe("phone");
    expect(meta.dense).toBe(true);
    expect(meta.weight).toBe(3);
    expect(meta.states).toEqual(["filled", "success"]);
    expect(meta.parts).toEqual(["root", "text", "uses", "next", "back", "timer"]);
    expect(meta.realPath).toContain("stays awake");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain("Steps");
    expect(probes.filter((probe) => probe.kind === "choose")).toHaveLength(2);
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "Steps")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "CookSteps" });
    expect(probes.filter((probe) => probe.kind === "read")).toHaveLength(2);
  });
});

describe("CookSteps states, parts and read/act", () => {
  it.each([1, 2, 3])("offers navigation only within the recipe at step %s", (at) => {
    const input = { steps: [step, { text: "Untimed instruction" }, step], at };
    const parsed = props.parse(input);
    const actions = affordancesOf(meta, stampItemIds(meta, parsed), "c1");
    expect(actions.map(({ address, action }) => `${address} ${action}`)).toEqual([
      ...(at === 2 ? [] : ["c1/timer start", "c1/timer stop"]),
      ...(at < 3 ? ["c1/next press"] : []),
      ...(at > 1 ? ["c1/back press"] : []),
    ]);
    const html = renderInstance("CookSteps", input, "filled", theme);
    expect(elementAt(html, "home/c1/next").attributes.includes('aria-disabled="true"')).toBe(at === 3);
    expect(elementAt(html, "home/c1/back").attributes.includes('aria-disabled="true"')).toBe(at === 1);
    for (const { address } of actions)
      expect(elementAt(html, `home/${address}`).attributes).toContain('role="button"');
  });
  it.each(examples)("renders the current text, ingredients and conditional timer", (input) => {
    const current = input.steps[input.at - 1]!;
    const html = renderInstance("CookSteps", input, "filled", theme);
    const read = readComponent(components.CookSteps, input, "c1").join("\n");
    expect(html.match(/data-testid="home\/c1\/root"/g)).toHaveLength(1);
    expect(html).toContain(current.text);
    expect(read).toContain(current.text);
    for (const unused of input.steps.filter((_, index) => index !== input.at - 1)) {
      expect(html).not.toContain(unused.text);
      expect(read).not.toContain(unused.text);
    }
    expect(html.includes('data-testid="home/c1/uses"')).toBe(current.uses.length > 0);
    expect(html.includes('data-testid="home/c1/timer"')).toBe(current.minutes !== undefined);
  });
  it("keeps a single untimed instruction inert and draws the completed state without controls", () => {
    const input = { steps: [{ text: "Single instruction" }] };
    expect(affordancesOf(meta, stampItemIds(meta, props.parse(input)), "c1")).toEqual([]);
    const html = renderInstance("CookSteps", examples[0], "success", theme);
    expect(html).toContain("Recipe complete");
    expect(html).toContain("All steps finished.");
    expect(html).not.toContain('role="button"');
    expect(html).not.toContain('data-testid="home/c1/timer"');
    expect(meta.read(props.parse(input), "success")).toEqual([]);
  });
});
