import { z } from "zod";
import {
  itemsOf,
  clockLine,
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
  type Props,
} from "../../../catalog";
import { KitAction, KitCard, KitContent, KitGrid, KitText, useComponentState } from "../../../kit";
import { cookStepsLabels, cookStepsReading } from "../copy";

// Core first: Steps/numbered cannot show one cooking instruction with ingredients and an optional timer.
export const meta = {
  id: "CookSteps",
  status: "ready",
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
  read: (input, state) => {
    if (state !== "filled") return [];
    const value = input as z.output<typeof props>;
    return cookStepsReading(value.steps, value.at);
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
  // Ledge: the plant keeper's household supper.
  {
    steps: [
      { text: "Simmer the tomato sauce.", uses: ["Tomatoes", "Olive oil"], minutes: 20 },
      { text: "Layer the sauce and pasta.", uses: ["Lasagne sheets"] },
      { text: "Bake until golden.", uses: [], minutes: 40 },
    ],
    at: 1,
  },
  // Trot: breakfast before the walking round.
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

export function CookSteps({ steps, at }: Props<typeof props, typeof meta>) {
  const done = useComponentState() === "success";
  const step = steps[at - 1]!;
  return (
    <KitCard style="inset" part="root" padded>
      <KitContent>
        <KitText role="caption" tone={done ? "good" : "muted"} part={null}>
          {done ? cookStepsLabels.done : stepLine(at, steps.length)}
        </KitText>
        <KitText role="title" part="text">
          {done ? cookStepsLabels.finished : step.text}
        </KitText>
      </KitContent>
      {!done && step.uses.length > 0 && (
        <KitContent group="response">
          <KitText role="caption" tone="muted" part="uses">
            {step.uses.join(" · ")}
          </KitText>
        </KitContent>
      )}
      {!done && step.minutes !== undefined && (
        <KitContent group="response">
          <KitText role="caption" tone="muted" part={null}>
            {cookStepsLabels.timer}
          </KitText>
          <KitText role="number" numberScale="compact" tabular part={null}>
            {clockLine(step.minutes * 60)}
          </KitText>
          <KitGrid columns={2}>
            <KitAction label={timerLabels.start} kind="secondary" part="timer" action="start" full />
            <KitAction label={timerLabels.stop} kind="quiet" part="timer" action="stop" full />
          </KitGrid>
        </KitContent>
      )}
      {!done && (
        <KitContent group="response">
          <KitAction label={cookStepsLabels.next} part="next" disabled={at === steps.length} full />
          <KitAction label={cookStepsLabels.back} kind="quiet" part="back" disabled={at === 1} full />
        </KitContent>
      )}
    </KitCard>
  );
}
