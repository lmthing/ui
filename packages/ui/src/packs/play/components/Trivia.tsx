import {
  detailOf,
  itemsOf,
  photo,
  planAct,
  placeholderTitle,
  probesFor,
  sessionAvailable,
  sessionKey,
  sessionState,
  text,
  thingOf,
  titleOf,
  wordsFor,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../../../catalog";
import { z } from "zod";
// prettier-ignore
import {
  KitAction, KitCard, KitContent, KitEmpty, KitPhoto, KitRow, KitSkeleton, KitText, PartScope,
  useControlValue, useKit, usePartContext, useWords,
} from "../../../kit";
import { triviaPointsCopy } from "../copy";
import { playWordsFor } from "../lang";

// Core first: Choice/default cannot run a host-led question/reveal sequence without grading submissions.
export const meta = {
  id: "Trivia",
  status: "ready",
  group: "content",
  purpose: "Host questions aloud, reveal answers and advance without grading submitted responses.",
  pick: "Host-controlled question and answer reveals for players answering aloud or on paper. Not private option selection (Choice), graded submissions (Quiz), or spaced recall (Flashcard).",
  writeHints: [
    "Write seed question, answer, optional explanation/photo and points. Never write submissions, grades, awarded scores, current index or reveal state.",
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  confirmParts: ["restart"],
  realPath: "A local deck uses host-controlled reveals; awarded points are recorded separately.",
  parts: ["root", "question", "answer", "explain", "photo", "points", "reveal", "next", "restart"],
  states: ["filled", "loading", "success", "empty"],
  session: {
    kind: "rounds",
    items: "questions",
    hidden: ["answer", "explain"],
    reveal: "reveal",
    next: "next",
    restart: "restart",
  },
  actions: { parts: { reveal: ["press"], next: ["press"], restart: ["press"] } },
  successActions: ["next.press", "restart.press"],
  read: (input, _state, lang) => {
    const question = (input as z.output<typeof props>).questions[0];
    return question ? [triviaPointsCopy(question.points, lang).line] : [];
  },
} as const satisfies Meta;
export const props = z.strictObject({
  questions: z
    .array(
      z.strictObject({
        question: text(120),
        answer: text(120),
        explain: text(160).optional(),
        photo: photo.optional(),
        points: z.int().min(1).max(20).default(1),
      }),
    )
    .min(1)
    .max(6),
  style: z.enum(["card", "large"]).default("card"),
});
export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const { placeholderDetail } = wordsFor(lang);

  const thing = thingOf(cast);
  const questions = itemsOf(cast, 3).map((item, index) => ({
    question: titleOf(item, 120, thing) ?? placeholderTitle(index, lang),
    answer: detailOf(item, 120, thing) ?? placeholderDetail,
  }));
  return {
    questions: questions.length
      ? questions
      : [{ question: placeholderTitle(0, lang), answer: placeholderDetail }],
  };
}
export const examples = [
  // Ledge's host reads a plant question.
  {
    questions: [
      {
        question: "What absorbs water?",
        answer: "Roots",
        explain: "Roots absorb water from the soil.",
        photo: "lib:plants",
        points: 2,
      },
      { question: "What gives leaves their green colour?", answer: "Chlorophyll" },
    ],
    style: "card",
  },
  // Trot's walkers host a question aloud after their round.
  { questions: [{ question: "Why do dogs pant?", answer: "To cool down", points: 1 }], style: "large" },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("Trivia");
export const probes = [
  choose(
    "Read a pub-quiz question aloud, reveal its answer on the host's phone, then advance; no graded submissions",
  ),
  choose(
    "Privately pick one answer from three options, each with an explanation; no host or reveal sequence",
    "Choice",
  ),
  write(
    "Host two questions aloud: Which part takes up water? Roots, worth two points. What makes leaves green? Chlorophyll, worth one. Large question style.",
  ),
  read("Reveal the answer to the current question", { address: "t1/reveal", action: "press" }),
  read("Restart the question deck", { address: "t1/restart", action: "press" }),
] satisfies Probe[];

type TriviaProps = Props<typeof props, typeof meta>;
type VisibleQuestion = Omit<TriviaProps["questions"][number], "answer"> & { answer?: string };

// The standalone gallery has no controller to perform the reveal for its success preview.
function previewReveal(input: TriviaProps, screen: string, id: string) {
  const result = planAct(
    { id: screen, components: [{ ...input, id, c: meta.id }] },
    { Trivia: { meta, props, fallback, examples, probes } },
    {},
    [{ address: `${id}/reveal`, action: "press" }],
    null,
  );
  return result.ok ? result.values[`${screen}/${id}/${sessionKey}`] : undefined;
}

// prettier-ignore
function TriviaActions({ primary, loading }: { primary?: "reveal" | "next" | undefined; loading?: boolean }) {
  const { words: { trivia } } = useWords(playWordsFor);
  const restart = <KitRow inline role="button" part="restart" label={trivia.restart} lineRole="label">
    <KitContent inset="md"><KitText role="label" tone="muted" part={null}>{trivia.restart}</KitText></KitContent>
  </KitRow>;
  const kind = primary === "next" ? "primary" : "secondary";
  const lead = primary && (loading ? <KitSkeleton shape="control" label={trivia[primary]} kind={kind} />
    : <KitAction label={trivia[primary]} part={primary} action="press" kind={kind} />);
  return <KitContent group="response" leadingAlign="row" lead={lead}>
    {loading ? <KitSkeleton shape="control" kind="quiet" label={trivia.restart} /> : restart}
  </KitContent>;
}

// prettier-ignore
export function Trivia(input: TriviaProps) {
  const scope = usePartContext();
  const { screen, component, state, thing } = scope;
  const { controller } = useKit();
  const { lang, words: { trivia } } = useWords(playWordsFor);
  const saved = useControlValue<unknown>(`${screen}/${component}/${sessionKey}`, undefined);
  const current = sessionState(meta, input, () =>
    !controller && state === "success" ? previewReveal(input, screen, component) : saved,
  );
  if (state === "empty" || current?.kind !== "rounds") return <KitCard part="root" padded>
    <PartScope {...scope} thing={thing ?? trivia.emptyThing}><KitEmpty icon="help" part="question" decorativeIcon /></PartScope>
  </KitCard>;
  const item = current.item as VisibleQuestion;
  const points = triviaPointsCopy(item.points, lang);
  const emphasis = input.style === "large" ? "hero" : "normal";
  if (state === "loading") return <KitCard part="root" padded>
    <KitSkeleton shape="figure" inset="none" lead={item.photo ? "box" : "none"}
      content={[[input.style === "large" ? "title" : "heading", item.question], ["number", points.line, "start", "compact"]]} />
    <TriviaActions primary="reveal" loading />
  </KitCard>;
  const primary = !current.revealed ? "reveal" : sessionAvailable(current, "next") ? "next" : undefined;
  return (
    <KitCard part="root" padded>
      <KitContent leadingAlign="row"
        lead={item.photo && <KitPhoto part="photo" photo={item.photo} label={trivia.photo} />}>
        <KitText role="heading" part="question" emphasis={current.revealed ? "quiet" : emphasis}
          tone={current.revealed ? "muted" : "text"}>{item.question}</KitText>
        <KitText role="label" tone="muted" part="points">
          {points.before}<KitText role="number" numberScale="compact" tabular part={null}>{points.value}</KitText>{points.after}
        </KitText>
      </KitContent>
      {item.answer && (
        <KitContent group="response">
          <KitText role="heading" part="answer" emphasis="hero">{item.answer}</KitText>
          {item.explain && <KitText role="label" tone="muted" part="explain">{item.explain}</KitText>}
        </KitContent>
      )}
      <TriviaActions primary={primary} />
    </KitCard>
  );
}
