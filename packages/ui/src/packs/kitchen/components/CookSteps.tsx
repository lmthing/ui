import { z } from "zod";
import {
  itemsOf,
  clockLine,
  kitchenLabels,
  placeholderDetail,
  probesFor,
  stepLine,
  text,
  thingOf,
  titleOf,
  timerLabels,
  type CastLike,
  type Meta,
  type Probe,
} from "../../../catalog";

// Core first: Steps/numbers cannot show one cooking instruction with ingredients and an optional timer.
export const meta = {
  id: "CookSteps",
  status: "draft",
  group: "action",
  purpose: "Follow a recipe one instruction at a time with ingredients and a step timer.",
  pick: "Cooking mode showing one recipe instruction, its ingredients and optional timer. Not progress through screens (Steps), a lesson (Lesson), or recording chapters (ChapterList).",
  writeHints: [
    "at is the one-based current step, between 1 and steps.length. minutes belongs only to timed instructions. Do not write timer state.",
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "Recipe steps stored on the device; the screen stays awake while cooking.",
  parts: ["root", "text", "uses", "next", "back", "timer"],
  states: ["filled", "success"],
  actions: {
    parts: { timer: ["start", "stop"], next: ["press"], back: ["press"] },
    when: { next: { canNext: true }, back: { canBack: true } },
  },
  read: (input) => {
    const value = input as z.output<typeof props>;
    const step = value.steps[value.at - 1]!;
    return [
      stepLine(value.at, value.steps.length),
      step.text,
      ...step.uses,
      ...(step.minutes === undefined
        ? []
        : [
            JSON.stringify(kitchenLabels.timer),
            clockLine(step.minutes * 60),
            JSON.stringify(timerLabels.start),
            JSON.stringify(timerLabels.stop),
            "\n",
          ]),
    ];
  },
} as const satisfies Meta;
export const props = z
  .strictObject({
    steps: z
      .array(
        z.strictObject({
          text: text(200),
          uses: z.array(text(20)).min(0).max(4).default([]),
          minutes: z.number().min(0.1).max(240).optional(),
        }),
      )
      .min(1)
      .max(20),
    at: z.int().min(1).max(20).default(1),
  })
  .refine((value) => value.at <= value.steps.length, {
    path: ["at"],
    message: "at must name an existing step",
  })
  .overwrite((value) => ({
    ...value,
    canNext: value.at < value.steps.length,
    canBack: value.at > 1,
    timer:
      value.steps[value.at - 1]?.minutes === undefined
        ? undefined
        : { minutes: value.steps[value.at - 1]!.minutes },
  }));
export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  const thing = thingOf(cast);
  const steps = itemsOf(cast, 3).map((item) => ({
    text: titleOf(item, 200, thing) ?? placeholderDetail,
    uses: [],
  }));
  return { steps: steps.length ? steps : [{ text: placeholderDetail, uses: [] }], at: 1 };
}
export const examples = [
  {
    steps: [
      { text: "Simmer the tomato sauce.", uses: ["Tomatoes", "Olive oil"], minutes: 20 },
      { text: "Layer the sauce and pasta.", uses: ["Lasagne sheets"] },
      { text: "Bake until golden.", uses: [], minutes: 40 },
    ],
    at: 1,
  },
  {
    steps: [
      { text: "Mix the oats and milk.", uses: ["Oats", "Milk"] },
      { text: "Warm gently and stir.", uses: ["Cinnamon"], minutes: 5 },
    ],
    at: 2,
  },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("CookSteps");
export const probes = [
  choose(
    "Guide me through cooking a recipe one instruction at a time, with ingredients and a timer when needed",
  ),
  choose("Show how far I am through three screens of a signup flow", "Steps"),
  write(
    "Two cooking instructions: simmer tomatoes with olive oil for 20 minutes, then layer the sauce and pasta. Start at step one",
  ),
  read("Go to the next cooking instruction", { address: "c1/next", action: "press" }),
  read("Start the sauce's cooking timer", { address: "c1/timer", action: "start" }),
] satisfies Probe[];
