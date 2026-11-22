import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { readResult, resultFigures } from "../copy";
import { learningWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-Result.generated";

// Core first: Stats/default cannot show a practice score with corrections and review or retry controls.
export const meta = {
  id: "Result",
  status: "ready",
  group: "data",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Results are stored on the device.",
  variants: {
    emphasis: ["hero", "normal"],
    detail: ["full", "brief"],
  },
  variantParts: { "detail.brief": { hides: ["seconds", "points"] } },
  parts: ["root", "score", "right", "wrong", "seconds", "points", "review", "again"],
  items: { key: "mistakes", parts: ["root", "question", "answer"] },
  states: ["filled", "success"],
  actions: { parts: { review: ["press"], again: ["press"] }, when: { review: { has_mistakes: true } } },
  successActions: ["again.press"],
  readSuccess: true,
  read: readResult,
} as const satisfies c.Meta;

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    right: z.int().min(0).max(10000),
    of: z.int().min(1).max(10000),
    seconds: z.int().min(0).max(86400).optional(),
    points: z.int().min(0).max(1000000).optional(),
    mistakes: z
      .array(z.strictObject({ question: c.text(60), answer: c.text(40) }))
      .min(0)
      .max(5),
  })
  .refine(({ right, of }) => right <= of, { path: ["right"] })
  .refine(({ right, of, mistakes }) => mistakes.length <= of - right, { path: ["mistakes"] })
  .overwrite((value) => ({
    ...value,
    ...(value.detail === "brief" ? { seconds: undefined, points: undefined } : {}),
    has_mistakes: value.mistakes.length > 0,
  }));

export function fallback({ cast }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const mistakes = c.itemsOf(cast, 5).flatMap((item) => {
    const question = c.titleOf(item, 60, thing);
    const answer = c.detailOf(item, 40, thing);
    return question && answer ? [{ question, answer }] : [];
  });
  return { right: 0, of: Math.max(1, mistakes.length), mistakes };
}

export const examples = [
  // Ledge's fern practice finished without mistakes.
  { right: 6, of: 6, seconds: 58, points: 60, mistakes: [] },
  // Trot's walking-kit practice passed without mistakes.
  { right: 5, of: 5, seconds: 48, points: 50, mistakes: [] },
  {
    right: 9,
    of: 10,
    seconds: 92,
    points: 90,
    mistakes: [{ question: "What absorbs water in a fern?", answer: "Roots" }],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Result");
export const probes = [
  choose(
    "After my language drill, show the score, right and wrong counts, time taken and corrections with a way to retry.",
  ),
  choose(
    "Put three separate totals side by side: courses enrolled, notes saved and study hours. No grade, corrections or retry.",
    "Stats",
  ),
  write(
    "Show my kanji practice outcome: 9 correct of 10. Show the time taken (92 seconds) and points earned (90) on the card. One mistake: the reading of 川 is kawa.",
  ),
  {
    ...write(
      "Show the outcome of my fern quiz: 9 right out of 10, 92 seconds and 90 points. Keep the time and points recorded but hide them; don't change the card, score treatment or spacing. Keep my correction: What absorbs water in a fern? Roots.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Review the mistakes from this attempt.", { address: "r1/review", action: "press" }, 2),
] satisfies c.Probe[];

type ResultProps = c.Props<typeof props, typeof meta>;
type ResultWords = ReturnType<typeof learningWordsFor>["result"];

// prettier-ignore
function ResultMetrics({ values, words, density }: {
  values: ReturnType<typeof resultFigures>; words: ResultWords; density: c.ThemeDensity;
}) {
  const cell = (part: "right" | "wrong" | "seconds" | "points", value: string) =>
    <kit.KitContent key={part} density={density}>
      <kit.KitText role="label" tone="muted" part={null} density={density}>{words[part]}</kit.KitText>
      <kit.KitText role="number" numberScale="compact" tabular part={part} density={density}>{value}</kit.KitText>
    </kit.KitContent>;
  return <kit.KitContent group="response" density={density}>
    <kit.KitGrid density={density}>
      {cell("right", values.right)}
      {cell("wrong", values.wrong)}
      {values.seconds !== undefined && cell("seconds", values.seconds)}
      {values.points !== undefined && cell("points", values.points)}
    </kit.KitGrid>
  </kit.KitContent>;
}

// prettier-ignore
function Corrections({ mistakes, label, density }: {
  mistakes: ResultProps["mistakes"]; label: string; density: c.ThemeDensity;
}) {
  return <kit.KitContent group="response" density={density}>
    <kit.KitText role="label" tone="muted" part={null} density={density}>{label}</kit.KitText>
    <kit.KitGrid arrange="rows" list listRowGap="cards" density={density}>
      {mistakes.map(({ id, question, answer }) =>
        <kit.KitRow key={id} item={id} label={question} inline density={density}>
          <kit.KitText part="question" density={density}>{question}</kit.KitText>
          <kit.KitText part="answer" tone="muted" density={density}>{answer}</kit.KitText>
        </kit.KitRow>)}
    </kit.KitGrid>
  </kit.KitContent>;
}

// prettier-ignore
export function Result(input: ResultProps) {
  const state = kit.useComponentState();
  const { lang, words: { result } } = kit.useWords(learningWordsFor);
  const density = kit.useKit().density;
  const surface = "card";
  const emphasis = kit.useVariant("emphasis", meta.variants.emphasis, input.emphasis);
  const values = resultFigures(input, lang);
  const hasMistakes = input.mistakes.length > 0;
  const review = state === "filled" && hasMistakes;
  const perfect = input.right === input.of;
  const scoreTone = emphasis === "normal" ? "text" : perfect ? "good" : "accent";
  const again = <kit.KitAction part="again" action="press" kind="secondary" label={result.again} full />;
  return <kit.KitCard part="root" padded {...{ density, surface }}>
    <kit.KitContent density={density}>
      <kit.KitText role="label" tone={perfect && emphasis === "normal" ? "good" : "muted"} part={null} density={density}>{perfect ? result.perfect : result.score}</kit.KitText>
      <kit.KitText role="number" numberScale={emphasis === "hero" ? "display" : "compact"} tone={scoreTone} tabular part="score" {...{ density, emphasis }}>
        {values.right}<kit.KitText part={null} tone="muted" density={density}>{values.total}</kit.KitText>
      </kit.KitText>
    </kit.KitContent>
    <ResultMetrics words={result} {...{ values, density }} />
    {hasMistakes && <Corrections mistakes={input.mistakes} label={result.corrections} density={density} />}
    <kit.KitContent group="response" density={density}>
      {review ? <kit.KitGrid density={density}>
        <kit.KitAction part="review" action="press" kind="quiet" label={result.review} full />
        {again}
      </kit.KitGrid> : again}
    </kit.KitContent>
  </kit.KitCard>;
}
