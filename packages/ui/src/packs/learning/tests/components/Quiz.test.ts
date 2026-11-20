import { describe, expect, it } from "vitest";
import {
  components,
  createRegistry,
  packReady,
  planAct,
  readScreen,
  type ActStep,
  type CastLike,
} from "@lmthing/ui/catalog";
import { addressedElements, renderInstance } from "../../../../../test/render";

const quiz = components.Quiz;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const [choice, typed] = quiz.props.parse(quiz.examples[0]).questions;
const [binary, match] = quiz.props.parse(quiz.examples[1]).questions;
const check = { address: "q1/check", action: "press" };
const next = { address: "q1/next", action: "press" };
const select = (value: unknown, part = ""): ActStep => ({
  address: part ? `q1/${part}` : "q1",
  action: "select",
  value,
});
const type = (value: string): ActStep => ({ address: "q1/field", action: "type", value });
const screen = (...questions: unknown[]) => ({
  id: "home",
  components: [{ id: "q1", c: "Quiz", questions }],
});
const defs = { Quiz: quiz };
const run = (input: ReturnType<typeof screen>, ...steps: ActStep[]) => planAct(input, defs, {}, steps, null);
function readAfter(input: ReturnType<typeof screen>, ...steps: ActStep[]) {
  const result = run(input, ...steps);
  if (!result.ok) throw new Error(`Step ${result.at}: ${result.code}`);
  return readScreen(input, defs, result.values);
}

describe("Quiz contract", () => {
  it.each(quiz.examples)("parses a domain example", (example) => {
    expect(quiz.props.safeParse(example).success).toBe(true);
  });
  it("enforces exact text, question, option and pair bounds", () => {
    const longest = {
      kind: "match",
      question: "x".repeat(120),
      explain: "x".repeat(200),
      pairs: Array.from({ length: 5 }, (_, i) => ({ left: `${i}${"x".repeat(19)}`, right: "x".repeat(20) })),
    };
    expect(quiz.props.safeParse({ questions: Array(6).fill(longest) }).success).toBe(true);
    for (const questions of [
      [],
      Array(7).fill(longest),
      [{ ...longest, question: "x".repeat(121) }],
      [{ ...longest, explain: "x".repeat(201) }],
      [{ ...longest, pairs: [{ left: "x", right: "x" }] }],
      [{ ...longest, pairs: [...longest.pairs, longest.pairs[0]] }],
      [{ ...choice, options: ["One", "x".repeat(41)] }],
      [{ ...choice, options: ["One"] }],
      [{ ...choice, options: Array(6).fill("One") }],
      [{ ...choice, answer: 4 }],
      [{ ...choice, kind: "other" }],
      [{ ...binary, answer: "true" }],
      [{ ...typed, answer: false }],
      [{ ...longest, photo: "https://example.org/photo.jpg" }],
      [{ ...longest, color: "#aabbcc" }],
    ])
      expect(quiz.props.safeParse({ questions }).success).toBe(false);
    expect(quiz.props.safeParse({ questions: [choice], checked: true }).success).toBe(false);
  });
  it("uses cast copy and neutral placeholders for empty or malformed content", () => {
    const things = [{ type: "record", fields: ["label", "summary"] }];
    const casts: CastLike[] = [
      { things: [], items: [] },
      {
        things,
        items: [{ id: "one", type: "record", sample: true, label: "Record one", summary: "A detail" }],
      },
      { things, items: [{ id: "bad", type: "record", sample: true, label: "   ", summary: 5 }] },
    ];
    const fallbacks = casts.map((cast) => quiz.fallback({ cast }));
    for (const fallback of fallbacks) expect(quiz.props.safeParse(fallback).success).toBe(true);
    expect(fallbacks[0]?.questions[0]?.question).toBe("Item one");
    expect(fallbacks[1]?.questions[0]).toMatchObject({ question: "Record one", answer: "A detail" });
  });
  it("keeps tier, variants and the use and near-miss probes", () => {
    expect(quiz.meta.tier).toBe("phone");
    expect(quiz.meta.realPath).not.toBe("");
    expect(quiz.meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(quiz.probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "Choice" }));
    expect(quiz.probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "Quiz" }));
    expect(quiz.probes).toContainEqual(
      expect.objectContaining({ kind: "write", variant: { axis: "media", value: "none" } }),
    );
    expect(quiz.probes).toContainEqual(expect.objectContaining({ kind: "read", expect: check }));
    expect(createRegistry({ packs: ["learning"] }).ids.includes("Quiz")).toBe(packReady("learning"));
  });
});

describe("Quiz read and act", () => {
  it("submits a revised choice, keeps wrong feedback actionable, and resets for a typed question", () => {
    const input = screen(choice, typed);
    expect(run(input, check).ok).toBe(false);
    expect(run(input, next).ok).toBe(false);
    expect(run(input, select(3)).ok).toBe(false);
    const wrong = readAfter(input, select(0), select("B"), check);
    expect(wrong).toContain("(error)");
    expect(wrong).toContain("correct false — score 0/2");
    expect(wrong).toContain(choice!.explain!);
    expect(wrong).toContain("[q1/next press]");
    expect(wrong).not.toContain(typed!.question);
    expect(run(input, select(1), check, select(0)).ok).toBe(false);
    const second = readAfter(input, select(1), check, next);
    expect(second).toContain("[q1/field type]");
    expect(second).not.toContain(choice!.question);
    expect(second).not.toContain("[q1 select");
    expect(run(input, select(1), check, next, type("  "), check).ok).toBe(false);
    const complete = readAfter(input, select(0), check, next, type("wrong"), type(" Ｆronds "), check);
    expect(complete).toContain("correct true — score 2/2");
    expect(complete).not.toContain(String(typed!.answer));
    expect(complete).not.toContain("[q1/next press]");
    expect(run(input, select(0), check, next, type("fronds"), check, next).ok).toBe(false);
  });
  it("grades boolean indexes and blocks nonapplicable controls", () => {
    const input = screen(binary);
    expect(readAfter(input)).toContain("A · True — B · False");
    expect(run(input, select(2)).ok).toBe(false);
    expect(run(input, type("true")).ok).toBe(false);
    expect(run(input, select(0, "left")).ok).toBe(false);
    expect(readAfter(input, select(0), check)).toContain("correct true — score 1/1");
    expect(readAfter(input, select(1), check)).toContain("correct false — score 0/1");
  });
  it("requires every match and never discloses the pair solution in the read", () => {
    const input = screen(match);
    const pair = (left: number, right: number) => [select(left, "left"), select(right, "right")];
    expect(run(input, select(0, "right")).ok).toBe(false);
    expect(run(input, select(0, "left"), select(3, "right")).ok).toBe(false);
    expect(run(input, ...pair(0, 2), ...pair(1, 2), ...pair(2, 0), check).ok).toBe(false);
    expect(run(input, ...pair(0, 2), select(0, "right")).ok).toBe(false);
    const correct = readAfter(input, ...pair(0, 2), ...pair(1, 1), ...pair(2, 0), check);
    expect(correct).toContain("correct true — score 1/1");
    expect(correct).not.toContain(match!.pairs![0]!.right);
    expect(readAfter(input, ...pair(0, 1), ...pair(1, 2), ...pair(2, 0), check)).toContain("correct false");
  });
});

describe("Quiz parts and states", () => {
  const render = (input: unknown, state: "filled" | "error" | "success" = "filled") =>
    addressedElements(renderInstance("Quiz", input, state, theme));
  it("draws a radiogroup, optional photo, and only the active answer controls", () => {
    const first = render(quiz.examples[0]);
    expect(first.get("home/c1/root")?.attributes).toContain('role="radiogroup"');
    expect(first.has("home/c1/photo")).toBe(true);
    expect(first.get("home/c1/check")?.attributes).toContain('aria-disabled="true"');
    expect(first.has("home/c1/answer")).toBe(false);
    expect(render({ ...quiz.examples[0], media: "none" }).has("home/c1/photo")).toBe(false);
    expect(render({ questions: [typed] }).get("home/c1/field")?.attributes).toContain('role="textbox"');
    const matching = render({ questions: [match] });
    expect(matching.has("home/c1/left")).toBe(true);
    expect(matching.has("home/c1/right")).toBe(true);
    expect(matching.has("home/c1/field")).toBe(false);
  });
  it.each(["success", "error"] as const)("draws feedback and Next in %s after checking", (state) => {
    const feedback = render(quiz.examples[0], state);
    for (const part of ["answer", "explain", "feedback", "score", "next"])
      expect(feedback.has(`home/c1/${part}`)).toBe(true);
    expect(feedback.has("home/c1/check")).toBe(false);
    expect(render({ questions: [choice] }, state).has("home/c1/next")).toBe(false);
  });
});
