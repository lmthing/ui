import { expect, it } from "vitest";
import { z } from "zod";
import {
  planAct,
  readScreen,
  sessionKey,
  sessionState,
  text,
  type Definition,
  type Meta,
} from "../../../../catalog";
import { createInteractionStore, createScreenController } from "../../index";

const base = {
  id: "StudyFixture",
  group: "input",
  purpose: "Practise a sequence.",
  pick: "Test metadata-driven study actions.",
  region: "body",
  weight: 1,
  tier: "phone",
  realPath: "Keep practice progress on the device.",
} as const satisfies Meta;

const fixture = (meta: Meta, props: Definition["props"]): Definition => ({
  meta,
  props,
  fallback: () => ({}),
  examples: [],
  probes: [],
});
const quiz = fixture(
  {
    ...base,
    session: {
      kind: "rounds",
      items: "steps",
      hidden: ["solution", "reason"],
      reveal: "submit",
      next: "continue",
      assessment: {
        inputs: { root: "select", entry: "type" },
        readHidden: ["solution"],
        project: (row, answer) => ({
          choices: row.options,
          typed: !row.options,
          choice: answer.root,
          feedbackLength: row.reason ? (row.solution as string).length : 0,
        }),
        grade: (row, answer) => {
          const value = row.options
            ? answer.root
            : String(answer.entry ?? "")
                .trim()
                .toLowerCase();
          return value === undefined || value === "" ? undefined : String(value) === row.solution;
        },
      },
    },
    selections: { root: { prop: "choice", choices: { prop: "choices" } } },
    actions: {
      parts: { root: ["select"], entry: ["type"], submit: ["press"], continue: ["press"] },
      when: { entry: { typed: true }, submit: { checked: false }, continue: { checked: true } },
    },
    successActions: ["continue.press"],
    read: (input) => {
      const solution = (input as { steps: { solution?: string }[] }).steps[0]?.solution;
      return solution ? [JSON.stringify(solution)] : [];
    },
  },
  z.strictObject({
    steps: z.array(
      z.strictObject({
        cue: text(30),
        options: z.array(z.number()).optional(),
        solution: text(30),
        reason: text(60),
      }),
    ),
  }),
);
const recall = fixture(
  {
    ...base,
    session: {
      kind: "rounds",
      items: "deck",
      hidden: ["other"],
      front: ["cue"],
      reveal: "turn",
      ratings: ["low", "high"],
    },
    actions: {
      parts: { turn: ["flip"], low: ["press"], high: ["press"] },
      when: { low: { flipped: true }, high: { flipped: true } },
    },
  },
  z.strictObject({ deck: z.array(z.strictObject({ cue: text(30), other: text(30) })) }),
);

const press = (part: string) => ({ address: `study/${part}`, action: "press" });
const seed = {
  steps: [
    { cue: "First prompt", options: [1, 2], solution: "2", reason: "First explanation" },
    { cue: "Second prompt", solution: "planet", reason: "Second explanation" },
    { cue: "Third prompt", options: [0, 1, 2], solution: "0", reason: "Third explanation" },
  ],
};
const choice = (value: number) => ({ address: "study", action: "select", value });
const type = (value: string) => ({ address: "study/entry", action: "type", value });
const submit = press("submit");
const next = press("continue");

function study(def: Definition, input: Record<string, unknown>, requireMounted = false) {
  const screen = { id: "s", components: [{ id: "study", c: def.meta.id, ...input }] };
  const defs = { [def.meta.id]: def };
  const store = createInteractionStore();
  const controller = createScreenController({ screen, defs, store, requireMounted });
  const progress = () => sessionState(def.meta, input, (part) => store.get(`s/study/${part}`));
  return { controller, defs, progress, screen, store };
}

it("gates a mounted assessment, reads wrong and right feedback, and starts each question cleanly", () => {
  const { controller, progress, store } = study(quiz, seed, true);
  controller.registerPart("study");
  expect(controller.read()).toContain("[study select choices [1,2]]");
  expect(controller.read()).not.toMatch(/Second prompt|explanation|submit|continue/i);
  expect(controller.act(submit)).toMatchObject({ ok: false, code: "not_actionable" });
  expect(controller.act(choice(0))).toMatchObject({ ok: false, code: "invalid_value" });
  expect(controller.act([choice(1), submit, next, next])).toMatchObject({ ok: false, at: 3 });
  expect(controller.act([choice(1), submit, next], { dryRun: true }).ok).toBe(true);
  expect(store.get(`s/study/${sessionKey}`)).toBeUndefined();
  expect(controller.act([choice(1), submit]).ok).toBe(true);
  expect(controller.snapshotScreen().components[0]).toMatchObject({ state: "error", ...seed });
  expect(controller.read()).toContain("(error) correct false — score 0/3");
  expect(controller.read()).toContain('"First explanation" [study/continue press]');
  expect(controller.actionsAt("study")).toEqual([]);
  expect(controller.act(choice(2)).ok).toBe(false);
  controller.registerPart("study/continue");
  expect(controller.press("study/continue").ok).toBe(true);
  expect(controller.read()).not.toMatch(/First prompt|First explanation|submit|continue/);
  expect(controller.read()).toContain('"Second prompt" [study/entry type]');
  controller.registerPart("study/entry");
  expect(controller.act(type(" ")).ok).toBe(true);
  expect(controller.act(submit).ok).toBe(false);
  expect(controller.act([type(" Planet "), submit]).ok).toBe(true);
  expect(controller.read()).toContain("(success) correct true — score 1/3");
  expect(controller.read()).not.toContain('"planet"');
  expect(controller.act([next, choice(0), submit]).ok).toBe(true);
  expect(progress()).toMatchObject({
    complete: true,
    assessment: { correct: true, score: { right: 2, of: 3 } },
  });
  expect(controller.actionsAt("study/continue")).toEqual([]);
  expect(quiz.props.safeParse({ ...seed, score: 2 }).success).toBe(false);
});

it("dispatches session answers using the projected legacy choice list", () => {
  const { selections: _selections, ...meta } = quiz.meta;
  const select = { prop: "choice", choices: { root: { prop: "choices" } } };
  const { controller } = study({ ...quiz, meta: { ...meta, select } }, seed);
  expect(controller.read()).toContain("[study select choices [1,2]]");
  expect(controller.act([choice(2), submit]).ok).toBe(true);
  expect(controller.read()).toContain("correct true");
});

it("flips only the current card, records each rating, and completes without exposing a face", () => {
  const input = {
    deck: [
      { cue: "Front one", other: "Back one" },
      { cue: "Front two", other: "Back two" },
    ],
  };
  const { controller, progress, defs, screen } = study(recall, input);
  expect(controller.read()).toContain('"Front one" [study/turn flip]');
  expect(controller.read()).not.toMatch(/Back|Front two|high|low/);
  expect(controller.act(press("high")).ok).toBe(false);
  expect(controller.canPress("study/turn")).toBe(true);
  expect(controller.press("study/turn").ok).toBe(true);
  expect(controller.read()).toContain('"Back one" [study/low press] [study/high press]');
  expect(controller.read()).not.toMatch(/Front|turn/);
  expect(controller.press("study/high").ok).toBe(true);
  expect(progress()).toMatchObject({
    index: 1,
    revealed: false,
    recall: { remaining: 1, ratings: ["high"] },
  });
  expect(controller.act([press("low")], { dryRun: true }).ok).toBe(false);
  expect(controller.act([{ address: "study/turn", action: "flip" }, press("low")]).ok).toBe(true);
  expect(progress()).toMatchObject({
    complete: true,
    item: {},
    recall: { remaining: 0, ratings: ["high", "low"] },
  });
  expect(controller.read()).toBe("screen s\nstudy StudyFixture (success)");
  expect(controller.canPress("study/turn")).toBe(false);
  const plan = planAct(screen, defs, {}, [{ address: "study/turn", action: "flip" }, press("high")]);
  expect(plan.ok && readScreen(screen, defs, plan.values)).toContain('"Front two" [study/turn flip]');
});
