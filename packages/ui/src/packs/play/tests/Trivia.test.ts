import { describe, expect, expectTypeOf, it } from "vitest";
// prettier-ignore
import {
  components, createRegistry, emptyLine, loadingLabel, packReady,
  type CastLike, type Props, type ScreenLike, type StateName,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, elementAt, renderInstance } from "../../../../test/render";

const { props, meta, fallback, examples, probes } = components.Trivia;
const setup = examples[0]!;
const single = examples[1]!;
const parsed = props.parse(setup);
const first = parsed.questions[0]!;
const second = parsed.questions[1]!;
const explanation = first.explain!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const key = (part: string) => `home/t1/${part}`;
const press = (part: string) => ({ address: `t1/${part}`, action: "press" });
const render = (state: StateName, deck: unknown = setup, lang?: string) =>
  renderInstance("Trivia", deck, state, theme, { component: "t1", ...(lang ? { lang } : {}) });

function controller(state: StateName = "filled") {
  const screen: ScreenLike = { id: "home", components: [{ id: "t1", c: "Trivia", state, ...setup }] };
  return createScreenController({ screen, defs: components });
}

describe("Trivia contract and boundaries", () => {
  it.each(examples)("parses a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );

  it("trims text and applies the card and point defaults without adding item ids", () => {
    type View = Props<typeof props, typeof meta>;
    expectTypeOf<View["questions"][number]>().not.toHaveProperty("id");
    expect(props.parse({ questions: [{ question: " Prompt ", answer: " Reply " }] })).toEqual({
      questions: [{ question: "Prompt", answer: "Reply", points: 1 }],
      style: "card",
    });
  });

  it("accepts exact text, count and point limits and a local photo", () => {
    const row = {
      question: "q".repeat(120),
      answer: "a".repeat(120),
      explain: "e".repeat(160),
      photo: "local:1",
      points: 20,
    };
    expect(props.safeParse({ questions: Array.from({ length: 6 }, () => row) }).success).toBe(true);
  });

  it.each([
    {},
    { questions: [] },
    { questions: Array.from({ length: 7 }, () => first) },
    { questions: [{ ...first, question: "q".repeat(121) }] },
    { questions: [{ ...first, answer: "a".repeat(121) }] },
    { questions: [{ ...first, explain: "e".repeat(161) }] },
    { questions: [{ ...first, question: " " }] },
    { questions: [{ ...first, answer: "" }] },
    { questions: [{ ...first, points: 0 }] },
    { questions: [{ ...first, points: 21 }] },
    { questions: [{ ...first, points: 1.5 }] },
    { questions: [{ ...first, photo: "https://example.org/photo.png" }] },
    { questions: [{ ...first, grade: true }] },
    { questions: [{ ...first, id: "r1" }] },
    { ...setup, style: "wide" },
    { ...setup, color: "red" },
    { ...setup, index: 1, revealed: true, $session: {} },
  ])("rejects invalid or runtime-only input", (input) => expect(props.safeParse(input).success).toBe(false));

  it("preserves the core-first probes and the pack readiness gate", () => {
    expect(meta.tier).toBe("phone");
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain("Choice");
    expect(probes).toEqual([
      expect.objectContaining({ kind: "choose", expect: "Trivia" }),
      expect.objectContaining({ kind: "choose", expect: "Choice" }),
      expect.objectContaining({ kind: "write", expect: "Trivia" }),
      expect.objectContaining({ kind: "read", expect: press("reveal") }),
      expect.objectContaining({ kind: "read", expect: press("restart") }),
    ]);
    expect(createRegistry({ packs: ["play"] }).ids.includes(meta.id)).toBe(packReady("play"));
  });
});

describe("Trivia fallback", () => {
  it("uses matching cast fields and neutral placeholders for empty or malformed records", () => {
    const things = [{ type: "entry", fields: ["name", "detail"] }];
    const record = { id: "one", type: "entry", sample: true };
    const casts: CastLike[] = [
      { things: [], items: [] },
      { things, items: [{ ...record, name: "Prompt", detail: "Reply" }] },
      { things, items: [{ ...record, name: 4 }] },
    ];
    for (const cast of casts) expect(props.safeParse(fallback({ cast })).success).toBe(true);
    expect(fallback({ cast: casts[0]! }).questions).toEqual([{ question: "Item one", answer: "Details" }]);
    expect(fallback({ cast: casts[1]! }).questions).toEqual([{ question: "Prompt", answer: "Reply" }]);
    expect(fallback({ cast: casts[2]! }).questions).toEqual(fallback({ cast: casts[0]! }).questions);
  });
});

describe("Trivia states and parts", () => {
  it("renders only the active question, photo and localized points before reveal", () => {
    const html = render("filled", setup, "ar");
    const parts = addressedElements(html);
    for (const part of ["root", "question", "points", "photo"]) expect(parts.has(key(part))).toBe(true);
    for (const part of ["reveal", "restart"])
      expect(elementAt(html, key(part)).attributes).toContain('role="button"');
    for (const part of ["answer", "explain", "next"]) expect(parts.has(key(part))).toBe(false);
    for (const text of [first.answer, explanation, second.question, second.answer])
      expect(html).not.toContain(text);
    const points = parts.get(key("points"))!;
    expect(points.children[0]?.text).toEqual([new Intl.NumberFormat("ar").format(2)]);
    expect(points.text).toContain(" points");
    expect(addressedElements(render("filled", single)).has(key("photo"))).toBe(false);
  });

  it("shows the revealed state in a standalone preview and omits Next on the final question", () => {
    const html = render("success");
    const parts = addressedElements(html);
    expect(parts.get(key("answer"))?.text).toContain(first.answer);
    expect(parts.get(key("explain"))?.text).toContain(explanation);
    expect(parts.has(key("reveal"))).toBe(false);
    expect(elementAt(html, key("next")).attributes).toContain('role="button"');
    const final = addressedElements(render("success", single));
    expect(final.has(key("next"))).toBe(false);
    expect(final.has(key("explain"))).toBe(false);
    expect(final.has(key("restart"))).toBe(true);
  });

  it.each(["loading", "empty"] as const)("does not mount session actions during %s", (state) => {
    const html = render(state);
    expect(html).toContain(state === "loading" ? loadingLabel : emptyLine("trivia question"));
    if (state === "empty") expect(html).not.toContain(first.question);
    expect(html).not.toContain(first.answer);
    const parts = addressedElements(html);
    for (const part of ["reveal", "next", "restart", "answer", "photo", "points"])
      expect(parts.has(key(part))).toBe(false);
    if (state === "loading") expect(parts.has(key("question"))).toBe(false);
    const game = controller(state);
    expect(game.read()).toBe(`screen home\nt1 Trivia (${state})`);
    for (const part of ["reveal", "next", "restart"]) expect(game.act(press(part)).ok).toBe(false);
  });
});

describe("Trivia read and act", () => {
  it("reads only the current visible facts, offers Next after reveal, and stops on the last answer", () => {
    const game = controller();
    const initial = game.read();
    expect(initial).toContain(`2 points — Reveal answer — Restart — "${first.question}" — photo:plants`);
    expect(initial).toContain("[t1/reveal press] [t1/restart press]");
    expect(initial).not.toContain("Next question");
    expect(initial.split(`"${first.question}"`)).toHaveLength(2);
    for (const hidden of [first.answer, explanation, second.question, second.answer])
      expect(initial).not.toContain(hidden);
    expect(game.act(press("next")).ok).toBe(false);
    expect(game.act(press("reveal")).ok).toBe(true);
    const revealed = game.read();
    expect(revealed).toContain(
      `Trivia (success) 2 points — Next question — Restart — "${first.question}" — "${first.answer}"`,
    );
    expect(revealed).toContain(`"${explanation}"`);
    expect(revealed).toContain("[t1/next press]");
    expect(revealed).not.toMatch(/Reveal answer|\[t1\/reveal/);
    expect(game.act(press("reveal")).ok).toBe(false);
    expect(game.act(press("next")).ok).toBe(true);
    expect(game.read()).toContain(`1 point — Reveal answer — Restart — "${second.question}"`);
    expect(game.read()).not.toMatch(/Chlorophyll|photo:plants|Trivia \(success\)/);
    expect(game.act(press("reveal")).ok).toBe(true);
    const final = game.read();
    expect(final).toContain(`Trivia (success) 1 point — Restart — "${second.question}" — "${second.answer}"`);
    expect(final).not.toMatch(/Reveal answer|Next question|\[t1\/next/);
    expect(game.act(press("next")).ok).toBe(false);
  });

  it("requires confirmation for Restart, supports cancellation and clears only session progress", () => {
    const game = controller();
    game.store.set("home/score/r1/score", 12);
    expect(game.act(press("restart")).ok).toBe(true);
    expect(game.confirmation).toBeDefined();
    expect(game.press("confirm/cancel").ok).toBe(true);
    expect(game.act([press("reveal"), press("next"), press("reveal")]).ok).toBe(true);
    const progress = game.store.get(key("$session"));
    expect(game.act(press("restart")).ok).toBe(true);
    expect(game.store.get(key("$session"))).toBe(progress);
    expect(game.press("confirm/cancel").ok).toBe(true);
    expect(game.store.get(key("$session"))).toBe(progress);
    expect(game.act(press("restart")).ok).toBe(true);
    expect(game.press("confirm/confirm").ok).toBe(true);
    expect(game.store.get(key("$session"))).toBeUndefined();
    expect(game.store.get("home/score/r1/score")).toBe(12);
    expect(game.snapshotScreen().components[0]).toMatchObject({ questions: setup.questions });
    expect(game.read()).toContain(`"${first.question}"`);
    expect(game.read()).not.toContain(first.answer);
  });
});
