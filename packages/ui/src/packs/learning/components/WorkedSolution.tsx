import { z } from "zod";
import * as c from "../../../catalog";

// Core first: Steps/numbered tracks position, but cannot show progressive derivations, equations or a final answer.
export const meta = {
  id: "WorkedSolution",
  status: "draft",
  group: "content",
  tier: "phone",
  pick: "Show how a specific problem is solved, with numbered derivation steps and an answer. Not general teaching (Lesson), quizzes (Quiz), recipes (CookSteps), or a bare step position (Steps).",
  purpose: "Work through a problem one derivation step at a time.",
  region: "body",
  weight: 3,
  dense: true,
  realPath: "Pre-authored derivations run on the device or an external solver generates them on request.",
  parts: ["root", "problem", "subject", "photo", "next", "all", "answer", "copy", "tutor", "solve", "status"],
  items: { key: "steps", parts: ["root", "title", "explanation", "formula", "copy"] },
  partTiers: { solve: "service" },
  actions: {
    parts: { next: ["press"], all: ["press"], copy: ["copy"], tutor: ["press"], solve: ["press"] },
    items: { copy: ["copy"] },
  },
  states: ["filled", "empty", "loading", "success", "error"],
} as const satisfies c.Meta;

const step = z.strictObject({
  title: c.text(40),
  explanation: c.text(240),
  formula: c.text(160).optional(),
});

export const props = z.strictObject({
  subject: c.text(20).optional(),
  problem: c.text(200),
  problemPhoto: c.photo.optional(),
  steps: z.array(step).min(1).max(10),
  answer: c.text(80),
  tutorGoto: c.screenId.optional(),
  style: z.enum(["stepped", "all"]).default("stepped"),
});

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const [seed] = c.itemsOf(cast, 1);
  const thing = c.thingOf(cast);
  const title = (max: number, index: number) =>
    (seed && c.titleOf(seed, max, thing)) ?? c.clip(c.placeholderTitle(index, lang), max);
  const detail = (seed && c.detailOf(seed, 240, thing)) ?? c.wordsFor(lang).placeholderDetail;
  return {
    problem: title(200, 0),
    steps: [{ title: title(40, 1), explanation: detail }],
    answer: title(80, 2),
  };
}

export const examples = [fallback({ cast: { things: [], items: [] } })] satisfies z.input<typeof props>[];
export const probes: c.Probe[] = [];

export function WorkedSolution(_input: c.Props<typeof props, typeof meta>) {
  return null;
}
