// prettier-ignore
import {
  detailOf, itemsOf, photo, planAct, placeholderTitle, probesFor, sessionAvailable,
  sessionKey, sessionState, text, thingOf, titleOf, variantProps, wordsFor,
  type FallbackInput, type Meta, type Probe, type Props, type SessionState,
} from "../../../catalog";
import { z } from "zod";
// prettier-ignore
import {
  KitAction, KitCard, KitContent, KitEmpty, KitPhoto, KitRow, KitSkeleton, KitText, PartScope,
  useControlValue, useKit, usePartContext, useVariant, useWords,
} from "../../../kit";
import { triviaPointsCopy } from "../copy";
import { playWordsFor } from "../lang";

// Core first: Choice/default cannot run a host-led question/reveal sequence without grading submissions.
// prettier-ignore
export const meta = {
  id: "Trivia", status: "ready", group: "content",
  purpose: "Host questions aloud, reveal answers and advance without grading submitted responses.",
  pick: "Host-controlled question and answer reveals for players answering aloud or on paper. Not private option selection (Choice), graded submissions (Quiz), or spaced recall (Flashcard).",
  writeHints: [
    "Write seed question, answer, optional explanation/photo, points and two to four display-only choices if requested. Keep the answer in answer; never write correct-choice indexes, submissions, grades, awarded scores, current index or reveal state.",
    'To hide photos alone use {"media":"none","emphasis":null,"density":null}. Keep the supplied photo in the question data. Use hero only when the user separately asks for large question text.',
  ],
  region: "body", weight: 2, tier: "phone",
  confirmParts: ["restart"],
  realPath: "A local deck uses host-controlled reveals; awarded points are recorded separately.",
  variants: { density: ["comfortable", "compact"], emphasis: ["normal", "hero"], media: ["thumb", "none"] },
  variantParts: { "media.none": { hides: ["photo"] } },
  parts: ["root", "question", "answer", "explain", "photo", "points", "choices",
    "choice_1", "choice_2", "choice_3", "choice_4", "reveal", "next", "restart"],
  states: ["filled", "loading", "success", "empty"],
  session: {
    kind: "rounds",
    items: "questions",
    hidden: ["answer", "explain"],
    reveal: "reveal", next: "next", restart: "restart",
  },
  actions: { parts: { reveal: ["press"], next: ["press"], restart: ["press"] } },
  successActions: ["next.press", "restart.press"],
  read: (input, _state, lang): string[] => {
    const value = input as z.output<typeof props> & { [sessionKey]?: SessionState };
    const current = value[sessionKey];
    const question = value.questions[0];
    if (current?.kind !== "rounds" || !question) return [];
    const words = playWordsFor(lang).trivia;
    const primary = primaryAction(current);
    const choices = visibleChoices(current);
    return [
      triviaPointsCopy(question.points, lang).line,
      ...(choices ? [words.choices, ...choices.map((choice) => JSON.stringify(choice))] : []),
      ...(primary ? [words[primary]] : []),
      words.restart,
    ];
  },
} as const satisfies Meta;
// prettier-ignore
export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    questions: z.array(z.strictObject({
      question: text(120), answer: text(120), explain: text(160).optional(),
      photo: photo.optional(), points: z.int().min(1).max(20).default(1),
      choices: z.array(text(120)).min(2).max(4).optional(),
    })).min(1).max(6),
  })
  .overwrite((value) =>
    value.media === "none"
      ? { ...value, questions: value.questions.map(({ photo: _photo, ...question }) => question) }
      : value,
  );
// prettier-ignore
export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const { placeholderDetail } = wordsFor(lang), thing = thingOf(cast);
  const questions = itemsOf(cast, 3).map((item, index) => ({
    question: titleOf(item, 120, thing) ?? placeholderTitle(index, lang),
    answer: detailOf(item, 120, thing) ?? placeholderDetail,
  }));
  return { questions: questions.length ? questions : [{ question: placeholderTitle(0, lang), answer: placeholderDetail }] };
}
// Ledge's host reads a plant question.
// prettier-ignore
const gardenDeck = { questions: [
  { question: "What draws water?", answer: "Roots", explain: "Roots absorb water from the soil.", photo: "lib:plants", points: 2 },
  { question: "What gives leaves their green colour?", answer: "Chlorophyll" },
] };
export const examples = [
  gardenDeck,
  // Trot's walkers host a question aloud after their round.
  { questions: [{ question: "Why do dogs pant?", answer: "To cool down", points: 1 }], emphasis: "hero" },
  { questions: [{ question: "Why do dogs pant?", answer: "To cool down", points: 1 }] },
  { ...gardenDeck, media: "none" },
  { ...gardenDeck, density: "compact" },
  { questions: [{ ...gardenDeck.questions[0]!, choices: ["Leaves", "Roots", "Flowers"] }] },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("Trivia");
// prettier-ignore
export const probes = [
  choose("Read a pub-quiz question aloud, reveal its answer on the host's phone, then advance; no graded submissions"),
  choose("Privately pick one answer from three options, each with an explanation; no host or reveal sequence", "Choice"),
  write("Host two questions aloud: Which part takes up water? Roots, worth two points. What makes leaves green? Chlorophyll, worth one. Make the question large."),
  {
    ...write("Host a trivia question with the answer hidden: What absorbs water? Roots. Keep lib:plants as its photo reference, but show no question photos on the phone."),
    variant: { axis: "media", value: "none" },
  },
  { ...write("For host-led trivia ask What draws water? List Leaves, Roots and Flowers as display-only options. The host reveals Roots; players answer aloud, without taps or grading."),
    expectProps: { questions: [{ choices: ["Leaves", "Roots", "Flowers"], answer: "Roots" }] } },
  read("Reveal the answer to the current question", { address: "t1/reveal", action: "press" }),
  read("Restart the question deck", { address: "t1/restart", action: "press" }),
] satisfies Probe[];
type TriviaProps = Props<typeof props, typeof meta>;
type VisibleQuestion = Omit<TriviaProps["questions"][number], "answer"> & { answer?: string };
function visibleChoices(current: Extract<SessionState, { kind: "rounds" }>) {
  return current.revealed ? undefined : (current.item as VisibleQuestion).choices;
}

function primaryAction(current: Extract<SessionState, { kind: "rounds" }>) {
  if (sessionAvailable(current, "reveal")) return "reveal";
  if (sessionAvailable(current, "next")) return "next";
}

// The standalone gallery has no controller to perform the reveal for its success preview.
// prettier-ignore
function previewReveal(input: TriviaProps, screen: string, id: string) {
  const result = planAct(
    { id: screen, components: [{ ...input, id, c: meta.id }] },
    { Trivia: { meta, props, fallback, examples, probes } },
    {}, [{ address: `${id}/reveal`, action: "press" }], null,
  );
  return result.ok ? result.values[`${screen}/${id}/${sessionKey}`] : undefined;
}

// prettier-ignore
function TriviaActions({ primary, loading, grouped }: { primary?: "reveal" | "next" | undefined; loading?: boolean; grouped?: boolean }) {
  const { words: { trivia } } = useWords(playWordsFor);
  const restart = <KitRow inline role="button" part="restart" label={trivia.restart} lineRole="label">
    <KitContent inset="md"><KitText role="label" tone="muted" part={null}>{trivia.restart}</KitText></KitContent>
  </KitRow>;
  const kind = primary === "next" ? "primary" : "secondary";
  const lead = primary && (loading ? <KitSkeleton shape="control" label={trivia[primary]} kind={kind} />
    : <KitAction label={trivia[primary]} part={primary} action="press" kind={kind} />);
  return <KitContent group={grouped ? "content" : "response"} leadingAlign="row" lead={lead}>
    {loading ? <KitSkeleton shape="control" kind="quiet" label={trivia.restart} /> : restart}
  </KitContent>;
}

// prettier-ignore
export function Trivia(input: TriviaProps) {
  const scope = usePartContext();
  const { screen, component, state, thing } = scope;
  const { controller } = useKit();
  const { lang, words: { trivia } } = useWords(playWordsFor);
  const density = useVariant("density", meta.variants.density, input.density);
  const saved = useControlValue<unknown>(`${screen}/${component}/${sessionKey}`, undefined);
  const current = sessionState(meta, input, () =>
    !controller && state === "success" ? previewReveal(input, screen, component) : saved,
  );
  if (state === "empty" || current?.kind !== "rounds") return <KitCard part="root" padded density={density}>
    <PartScope {...scope} thing={thing ?? trivia.emptyThing}><KitEmpty icon="help" part="question" decorativeIcon /></PartScope>
  </KitCard>;
  const item = current.item as VisibleQuestion;
  const choices = visibleChoices(current);
  const points = triviaPointsCopy(item.points, lang);
  const { emphasis } = input;
  if (state === "loading") return <KitCard part="root" padded density={density}>
    <KitContent group={item.photo ? "response" : "content"} density={density}>
      <KitSkeleton shape="figure" inset="none" lead={item.photo ? "box" : "none"} {...{ density, emphasis }}
        content={[["heading", item.question], ["number", points.line, "start", "compact"]]} />
    </KitContent>
    {choices && <KitSkeleton shape="figure" inset="none"
      content={[["label", trivia.choices], ...choices.map((choice) => ["body", choice] as const)]} />}
    <TriviaActions primary="reveal" loading grouped={Boolean(item.photo)} />
  </KitCard>;
  const primary = primaryAction(current);
  return (
    <KitCard part="root" padded density={density}>
      <KitContent leadingAlign="row" density={density}
        lead={item.photo && <KitPhoto part="photo" photo={item.photo} label={trivia.photo} />}>
        <KitText role="heading" part="question" density={density} emphasis={current.revealed ? "quiet" : emphasis}
          tone={current.revealed ? "muted" : "text"}>{item.question}</KitText>
        <KitText role="label" tone="muted" part="points">
          {points.before}<KitText role="number" numberScale="compact" tabular part={null}>{points.value}</KitText>{points.after}
        </KitText>
      </KitContent>
      {choices && <KitContent group="response" density={density}>
        <KitText role="label" part="choices">{trivia.choices}</KitText>
        {choices.map((choice, index) =>
          <KitText key={index} role="body" part={`choice_${index + 1}`}>{choice}</KitText>)}
      </KitContent>}
      {item.answer && (
        <KitContent group="response" density={density}>
          <KitText role="heading" part="answer" emphasis="hero">{item.answer}</KitText>
          {item.explain && <KitText role="label" tone="muted" part="explain">{item.explain}</KitText>}
        </KitContent>
      )}
      <TriviaActions primary={primary} />
    </KitCard>
  );
}
