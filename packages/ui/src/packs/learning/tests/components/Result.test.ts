import { describe, expect, it } from "vitest";
import {
  components,
  createRegistry,
  packReady,
  planAct,
  readComponent,
  type ActStep,
  type CastLike,
} from "@lmthing/ui/catalog";
import { addressedElements, renderInstance } from "../../../../../test/render";

const result = components.Result;
const [, perfect, withMistake] = result.examples;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const review = { address: "r1/review", action: "press" };
const again = { address: "r1/again", action: "press" };
const read = (input: unknown, state: "filled" | "success" = "filled") =>
  readComponent(result, input, "r1", state).join("\n");
const render = (input: unknown, state: "filled" | "success" = "filled") =>
  addressedElements(renderInstance("Result", input, state, theme));
const parts = (...names: string[]) => names.map((name) => `home/c1/${name}`);

function act(input: typeof withMistake, state: "filled" | "success", ...steps: ActStep[]) {
  const screen = { id: "home", components: [{ ...input, id: "r1", c: "Result", state }] };
  return planAct(screen, { Result: result }, {}, steps, null);
}

describe("Result contract and boundaries", () => {
  it.each(result.examples)("parses a domain example", (example) => {
    expect(result.props.safeParse(example).success).toBe(true);
  });

  it("accepts exact score, time, points, text, and row bounds", () => {
    const mistake = { question: "q".repeat(60), answer: "a".repeat(40) };
    const maximums = {
      right: 9995,
      of: 10000,
      seconds: 86400,
      points: 1000000,
      mistakes: Array(5).fill(mistake),
    };
    expect(result.props.safeParse(maximums).success).toBe(true);
    expect(result.props.safeParse({ right: 10000, of: 10000, mistakes: [] }).success).toBe(true);
    expect(result.props.safeParse({ right: 0, of: 1, seconds: 0, points: 0, mistakes: [] }).success).toBe(
      true,
    );
  });

  it.each([
    { right: -1 },
    { right: 1.5 },
    { right: 11 },
    { of: 0 },
    { of: 10001 },
    { seconds: -1 },
    { seconds: 86401 },
    { points: -1 },
    { points: 1000001 },
    { right: 10 },
    { right: 0, mistakes: Array(6).fill({ question: "Question", answer: "Answer" }) },
    { mistakes: [{ question: "q".repeat(61), answer: "Answer" }] },
    { mistakes: [{ question: "Question", answer: "a".repeat(41) }] },
    { mistakes: [{ question: "Question", answer: " " }] },
    { mistakes: [{ question: "Question", answer: "Answer", id: "r1" }] },
    { wrong: 1 },
    { has_mistakes: true },
    { detail: "summary" },
    { color: "#aabbcc" },
  ])("rejects invalid patch %j", (patch) => {
    expect(result.props.safeParse({ ...withMistake, ...patch }).success).toBe(false);
  });
});

describe("Result metadata", () => {
  it("keeps the phone tier, live pack gate, and core-first and variant probes", () => {
    expect(result.meta.tier).toBe("phone");
    expect(result.meta.realPath).not.toBe("");
    expect(result.meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(result.meta.variants).toMatchObject({
      emphasis: ["hero", "normal"],
    });
    expect(result.probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "Stats" }));
    expect(result.probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "Result" }));
    expect(result.probes).toContainEqual(expect.objectContaining({ kind: "write", expect: "Result" }));
    expect(result.probes).toContainEqual(
      expect.objectContaining({ kind: "write", variant: { axis: "detail", value: "brief" } }),
    );
    expect(result.probes).toContainEqual(
      expect.objectContaining({ kind: "read", screen: 2, expect: review }),
    );
    expect(createRegistry({ packs: ["learning"] }).ids.includes("Result")).toBe(packReady("learning"));
  });
});

describe("Result fallback", () => {
  it("uses at most five cast text pairs and never pads with invented correction text", () => {
    const things = [{ type: "record", fields: ["label", "summary"] }];
    const cast: CastLike = {
      things,
      items: Array.from({ length: 6 }, (_, index) => ({
        id: `record_${index}`,
        type: "record",
        sample: true,
        label: "Q".repeat(70),
        summary: "A".repeat(50),
      })),
    };
    const fallback = result.fallback({ cast });
    expect(result.props.safeParse(fallback).success).toBe(true);
    expect(fallback).toEqual({
      right: 0,
      of: 5,
      mistakes: Array(5).fill({ question: "Q".repeat(60), answer: "A".repeat(40) }),
    });
    for (const cast of [
      { things: [], items: [] },
      { things, items: [{ id: "bad", type: "record", sample: true, label: "Question", summary: 4 }] },
    ]) {
      const fallback = result.fallback({ cast });
      expect(result.props.safeParse(fallback).success).toBe(true);
      expect(fallback).toEqual({ right: 0, of: 1, mistakes: [] });
    }
  });
});

describe("Result parts and states", () => {
  it("renders the score, counts, optional figures, correction addresses, and both controls", () => {
    const nodes = render(withMistake);
    expect([...nodes.keys()]).toEqual(
      expect.arrayContaining(
        parts("root", "score", "right", "wrong", "seconds", "points", "r1/root", "r1/question", "r1/answer"),
      ),
    );
    expect(nodes.get("home/c1/wrong")?.text).toEqual(["1"]);
    for (const part of parts("review", "again"))
      expect(nodes.get(part)?.attributes).toContain('role="button"');
  });

  it("hides only the optional metrics in brief detail without removing corrections", () => {
    const input = { ...withMistake, detail: "brief" };
    const nodes = render(input);
    for (const part of parts("seconds", "points")) expect(nodes.has(part)).toBe(false);
    expect(nodes.has("home/c1/r1/answer")).toBe(true);
    expect(nodes.has("home/c1/review")).toBe(true);
    expect(read(input)).not.toMatch(/\b(?:Time|Points)\b/);
  });

  it("keeps success scores and retry without offering review, even for supplied corrections", () => {
    const success = render(withMistake, "success");
    expect(success.has("home/c1/r1/answer")).toBe(true);
    expect(success.has("home/c1/review")).toBe(false);
    expect(success.get("home/c1/again")?.attributes).toContain('role="button"');
    const minimal = render({ right: 5, of: 5, mistakes: [] }, "success");
    for (const part of parts("seconds", "points", "r1/root", "review")) expect(minimal.has(part)).toBe(false);
    expect(minimal.get("home/c1/wrong")?.text).toEqual(["0"]);
  });
});

describe("Result read and act", () => {
  it("reports the score and correction, and exposes review and retry only as available", () => {
    expect(read(withMistake)).toContain("9 of 10");
    expect(read(withMistake)).toContain("Time 1:32");
    expect(read(withMistake)).toContain("Points 90");
    expect(read(withMistake)).toContain('"Roots"');
    expect(read(withMistake)).toContain("[r1/review press]");
    expect(read(withMistake)).toContain("[r1/again press]");
    expect(read(perfect)).not.toContain("[r1/review press]");
    expect(read(perfect, "success")).toContain("5 of 5");
    expect(read(withMistake, "success")).toContain("[r1/again press]");
    expect(read(withMistake, "success")).not.toContain("[r1/review press]");
    expect(act(withMistake, "filled", review, again).ok).toBe(true);
    expect(act(perfect, "filled", review)).toMatchObject({ code: "not_actionable" });
    expect(act(withMistake, "success", review)).toMatchObject({ code: "not_actionable" });
    expect(act(withMistake, "success", again).ok).toBe(true);
  });
});
