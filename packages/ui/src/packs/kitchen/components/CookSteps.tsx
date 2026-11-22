import {
  useWords,
  KitAction,
  KitCard,
  KitContent,
  KitGrid,
  KitText,
  useComponentState,
  useVariant,
} from "../../../kit";
import {
  wordsFor,
  itemsOf,
  clockLine,
  probesFor,
  stepLine,
  text,
  thingOf,
  titleOf,
  variantProps,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../../../catalog";
import { kitchenWordsFor } from "../lang";
import { z } from "zod";
import { cookStepText, cookStepUses, cookStepsReading } from "../copy";
import { prompt } from "../../../entry/prompt-CookSteps.generated";

// Core first: Steps/numbered cannot show one cooking instruction with ingredients and an optional timer.
export const meta = {
  id: "CookSteps",
  status: "ready",
  group: "action",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "Recipe steps stored on the device; the screen stays awake while cooking.",
  parts: ["root", "text", "uses", "next", "back", "timer", "timer_stop"],
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["uses"] } },
  states: ["filled", "success"],
  actions: {
    parts: { timer: ["start"], timer_stop: ["stop"], next: ["press"], back: ["press"] },
    when: { next: { canNext: true }, back: { canBack: true } },
  },
  read: (input, state, lang?: string): string[] => {
    if (state !== "filled") return [];
    const value = input as z.output<typeof props>;
    return cookStepsReading(value.steps, value.at, lang, value.detail);
  },
} as const satisfies Meta;
export const props = z
  .strictObject({
    ...variantProps(meta.variants),
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
  .overwrite((value) => {
    const minutes = value.steps[value.at - 1]?.minutes;
    const timer = minutes === undefined ? undefined : { minutes };
    return {
      ...value,
      canNext: value.at < value.steps.length,
      canBack: value.at > 1,
      timer,
      timer_stop: timer,
    };
  });
export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const { placeholderDetail } = wordsFor(lang);

  const thing = thingOf(cast);
  const steps = itemsOf(cast, 3).map((item) => ({
    text: titleOf(item, 200, thing) ?? placeholderDetail,
    uses: [],
  }));
  return { steps: steps.length ? steps : [{ text: placeholderDetail, uses: [] }], at: 1 };
}
// prettier-ignore
const supper = { at: 1, steps: [
  { text: "Gently simmer the tomato sauce until thickened.", uses: ["Tomatoes", "Olive oil"], minutes: 20 },
  { text: "Layer the sauce and pasta.", uses: ["Lasagne sheets"] },
  { text: "Bake until golden.", uses: [], minutes: 40 },
] } satisfies z.input<typeof props>;
export const examples = [
  supper,
  { ...supper, detail: "brief" },
  // Trot: breakfast before the walking round.
  {
    steps: [
      { text: "Mix the oats and milk.", uses: ["Oats", "Milk"] },
      { text: "Warm gently, stirring until the oats turn creamy.", uses: ["Cinnamon"], minutes: 5 },
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
  {
    ...write(
      "Simmer tomato sauce for 20 minutes. Keep tomatoes and olive oil as ingredients, but hide the ingredients line.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Go to the next cooking instruction", { address: "c1/next", action: "press" }),
  read("Start the sauce's cooking timer", { address: "c1/timer", action: "start" }),
] satisfies Probe[];

// prettier-ignore
export function CookSteps({ steps, at, detail: choice }: Props<typeof props, typeof meta>) {
  const detail = useVariant("detail", meta.variants.detail, choice);
  const {
    lang,
    words: { timerLabels },
  } = useWords();
  const { cookStepsLabels } = kitchenWordsFor(lang);
  const done = useComponentState() === "success";
  const step = steps[at - 1]!;
  const next = <KitAction label={cookStepsLabels.next} part="next" disabled={at === steps.length} full />;
  const back = <KitAction label={cookStepsLabels.back} kind="quiet" part="back" disabled={at === 1} full />;
  return (
    <KitCard style="inset" part="root" padded>
      <KitContent>
        <KitText role="label" tone={done ? "good" : "muted"} part={null}>
          {done ? cookStepsLabels.done : stepLine(at, steps.length, lang)}
        </KitText>
        <KitText role="title" part="text">
          {done ? cookStepsLabels.finished : cookStepText(step.text)}
        </KitText>
      </KitContent>
      {!done && detail === "full" && step.uses.length > 0 && (
        <KitContent group="response">
          <KitText role="label" tone="muted" part="uses">
            {cookStepUses(step.uses, lang)}
          </KitText>
        </KitContent>
      )}
      {!done && step.minutes !== undefined && (
        <KitContent group="response">
          <KitText role="label" tone="muted" part={null}>
            {cookStepsLabels.timer}
          </KitText>
          <KitText role="number" tabular part={null}
            {...(detail === "brief" ? { numberScale: "compact", emphasis: "hero" } as const : {})}>
            {clockLine(step.minutes * 60, lang)}
          </KitText>
          <KitGrid columns={2}>
            <KitAction label={timerLabels.start} kind="secondary" part="timer" action="start" full />
            <KitAction label={timerLabels.stop} kind="quiet" part="timer_stop" action="stop" full />
          </KitGrid>
        </KitContent>
      )}
      {!done && (
        <KitContent group="response">
          {detail === "brief" ? <KitGrid columns={2}>{next}{back}</KitGrid> : <>{next}{back}</>}
        </KitContent>
      )}
    </KitCard>
  );
}
