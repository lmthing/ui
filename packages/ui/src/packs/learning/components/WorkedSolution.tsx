import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
// prettier-ignore
import { projectSolution, solutionIdentity, solutionProgress, solutionRead, solutionState, workedStepTitle } from "../copy";
import { learningWordsFor } from "../lang";

const stepLimit = 10;

// Core first: Steps/numbered tracks position, but cannot show progressive derivations, equations or a final answer.
// prettier-ignore
export const meta = {
  id: "WorkedSolution", status: "ready", group: "content", tier: "phone",
  pick: "Show how a specific problem is solved, with numbered derivation steps and an answer. Not general teaching (Lesson), quizzes (Quiz), recipes (CookSteps), or a bare step position (Steps).",
  purpose: "Work through a problem one derivation step at a time.",
  region: "body", weight: 3, dense: true,
  realPath: "Pre-authored derivations run on the device or an external solver generates them on request.",
  writeHints: [
    "Put the specific question in problem, then the ordered derivation steps in steps. Use formula only for exact math or code. Put the result in answer; the app counts steps and reveals the result.",
    'Use overflow "all" only when asked to show every step immediately; otherwise use null, even for one step. The default card and spacing are null, not "card" or "comfortable".',
    'Null media shows a supplied problemPhoto by default. To turn photo display off, retain the exact problemPhoto reference and write media "none"; null does not hide it. If there is no photo, use null for media.',
  ],
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"], media: ["cover", "none"], overflow: ["page", "all"] },
  variantParts: {
    "media.none": { hides: ["photo"] },
    "overflow.page": {
      adds: ["next", "next_label", "all", "all_label", "tutor_label"],
      hides: ["answer", "copy", "copy_icon", "status", "root", "title", "explanation", "formula"],
    },
  },
  parts: ["root", "problem", "subject", "photo", "progress", "next", "next_label", "all", "all_label",
    "answer", "copy", "copy_icon", "tutor", "tutor_label", "solve", "status", "solver_status"],
  items: { key: "steps", parts: ["root", "title", "explanation", "formula", "copy", "copy_icon"], visibleWhen: { revealed: true } },
  partTiers: { solve: "service" },
  actions: {
    parts: { next: ["press"], all: ["press"], copy: ["copy"], tutor: ["press"], solve: ["press"] },
    items: { copy: ["copy"] },
    when: { next: { moreSteps: true }, all: { moreSteps: true }, copy: { copyReady: true } },
  },
  states: ["filled", "empty", "loading", "success", "error"],
  successActions: ["copy.copy", "tutor.press", "solve.press"],
  readSuccess: true, localState: solutionState, live: { derive: projectSolution },
  hostCommands: {
    identity: ({ props, row }) => (row ? undefined : solutionIdentity(props)),
    parts: {
      "solve.press": {
        kind: "command", name: "solveProblem",
        input: ({ props }) => ({
          problem: String(props.problem),
          ...(typeof props.subject === "string" ? { subject: props.subject } : {}),
          ...(typeof props.sourcePhoto === "string" ? { photo: props.sourcePhoto } : {}),
        }),
      },
    },
  },
  read: solutionRead,
} as const satisfies c.Meta;

// prettier-ignore
const step = z.strictObject({ title: c.text(40), explanation: c.text(240), formula: c.text(160).optional() });
// prettier-ignore
export const props = z.strictObject({
  ...c.variantProps(meta.variants), subject: c.text(20).optional(), problem: c.text(200),
  problemPhoto: c.photo.optional(), steps: z.array(step).min(1).max(stepLimit),
  answer: c.text(80), tutorGoto: c.screenId.optional(),
});
// prettier-ignore
export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const [seed] = c.itemsOf(cast, 1), thing = c.thingOf(cast);
  const title = (max: number, index: number) => (seed && c.titleOf(seed, max, thing)) ?? c.clip(c.placeholderTitle(index, lang), max);
  const detail = (seed && c.detailOf(seed, 240, thing)) ?? c.wordsFor(lang).placeholderDetail;
  return { problem: title(200, 0), steps: [{ title: title(40, 1), explanation: detail }], answer: title(80, 2) };
}

// prettier-ignore
const fern = {
  subject: "Ratios", problem: "A fern needs 60 mL for 2 cups of soil. How much water for 5\u00a0cups?",
  steps: [
    { title: "Find the amount for one cup", explanation: "Divide the water by two to find the amount per cup of soil.", formula: "60 ÷ 2 = 30 mL per cup" },
    { title: "Scale to five cups", explanation: "Multiply the amount for one cup by the number of cups.", formula: "30 × 5 = 150 mL" },
    { title: "Check the units", explanation: "Cups cancel out, so the result is in millilitres." },
  ],
  answer: "150 mL", tutorGoto: "ratio_help",
} satisfies z.input<typeof props>;
// prettier-ignore
export const examples = [
  fern,
  { overflow: "all", surface: "outlined", subject: "Time", problem: "Clover’s walk starts at 10:45 and lasts 35 minutes. When does it end?",
    steps: [
      { title: "Reach the next hour", explanation: "Use 15 minutes to get to 11:00." },
      { title: "Add the time left", explanation: "There are 20 minutes left after the hour.", formula: "11:00 + 20 min = 11:20" },
    ], answer: "11:20" },
  { ...fern, problemPhoto: "lib:plants", density: "compact" },
  { ...fern, problemPhoto: "lib:plants", density: "compact", media: "none" },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("WorkedSolution");
// prettier-ignore
export const probes = [
  choose("Start with this specific math question, reveal the derivation line by line as I tap, then show the final answer. Let me copy each equation."),
  choose("In a four-screen setup flow, show just that I am on the second step of four, with four numbered positions. No worked answer.", "Steps"),
  write("Show how to solve 2x + 4 = 10. First subtract 4 from each side to get 2x = 6. Then divide by 2 to get x = 3. Reveal the steps one at a time and end with x = 3."),
  { ...write("Solve 2x + 4 = 10: subtract 4 to get 2x = 6, then divide by 2 to get x = 3. Show both derivation steps and the final answer at once instead of making me reveal them."),
    variant: { axis: "overflow", value: "all" } },
  { ...write("Solve 2x + 4 = 10: subtract 4 to get 2x = 6, then divide by 2 to get x = 3. Keep lib:worksheet as the saved scan reference. Turn photo display off explicitly; the default would show the scan. Keep all other settings at their defaults."),
    variant: { axis: "media", value: "none" } },
  read("Tap Next step once, not Show all steps.", { address: "w1/next", action: "press" }),
  read("Tap Show all steps to reveal the rest in one press, not Next step.", { address: "w1/all", action: "press" }),
  read("Copy the expression for the amount per cup.", { address: "w1/r1/copy", action: "copy" }),
  read("Open the follow-up tutor.", { address: "w1/tutor", action: "press" }),
] satisfies c.Probe[];

type View = c.Props<typeof props, typeof meta>;
type Density = c.ThemeDensity;
type Words = ReturnType<typeof learningWordsFor>["workedSolution"];

// prettier-ignore
function FormulaLoading({ label, source, density }: { label: string; source: string; density: Density }) {
  return <>
    <kit.KitRow part={null} label={label} tone="muted" density={density} trailing={<kit.KitAction part={null} kind="quiet" icon="clipboard" />}>
      <kit.KitLayoutText line={{ text: label, role: "body" }} density={density} /></kit.KitRow>
    <kit.KitSkeleton shape="figure" inset="md" density={density} content={[["body", source]]} />
  </>;
}

// prettier-ignore
function Derivation({ row, index, density, lang }: { row: View["steps"][number]; index: number; density: Density; lang: string }) {
  const words = learningWordsFor(lang).workedSolution;
  const title = workedStepTitle(row.title, index, lang);
  const loading = kit.useComponentState() === "loading";
  const formula = row.formula && (loading
    ? <FormulaLoading label={words.work} source={row.formula} density={density} />
    : <kit.KitCodeBlock part="formula" code={row.formula} label={words.work} copyTarget={{ part: "copy" }} wrap />);
  return <kit.KitRow item={row.id} part="root" label={title} inline fitContent density={density}>
    <kit.KitContent density={density}>
      <kit.KitMetaLine density={density} title={{ text: title, part: "title", strong: true }}
        meta={{ text: row.explanation, part: "explanation", role: "body" }} />
      {formula}
    </kit.KitContent></kit.KitRow>;
}

// prettier-ignore
function FinalAnswer({ answer, words, density }: { answer: string; words: Words; density: Density }) {
  const loading = kit.useComponentState() === "loading";
  const copy = <kit.KitAction part={loading ? null : "copy"} action="copy" kind="quiet" icon="clipboard" a11y={words.copy} copiedLabel={words.copied} value={answer} />;
  return <kit.KitRow part={null} label={words.answer} density={density} surface="tinted" tone="good" leadingAlign="row" trailing={copy}>
    <kit.KitMetaLine density={density} title={{ text: words.answer, role: "body" }}
      meta={{ text: answer, part: "answer", role: "figure", compact: true, tabular: true, tone: "text" }} />
  </kit.KitRow>; }

// prettier-ignore
function Solver({ words, density }: { words: Words; density: Density }) {
  const { controller } = kit.useKit(), scope = kit.usePartContext();
  const [operation] = kit.useHostOperations();
  const offered = controller?.actionsAt(c.formatAddress({ ...scope, part: "solve" })).includes("press");
  return <>
    {operation && <kit.KitLayoutText density={density} line={{ text: words.solver[operation.status], role: "body", part: "solver_status", tone: operation.status === "rejected" ? "bad" : "muted" }} />}
    {offered && <kit.KitActionFooter density={density}><kit.KitAction part="solve" action="press" label={words.solve} kind="quiet" /></kit.KitActionFooter>}
  </>; }

// prettier-ignore
function SolutionBody({ input, density, shown, photo }: { input: View; density: Density; shown: number; photo: boolean }) {
  const { lang, words: { workedSolution: words } } = kit.useWords(learningWordsFor);
  const state = kit.useComponentState();
  const done = shown === input.steps.length, loading = state === "loading";
  return <>
    <kit.KitHeader density="comfortable" title={{ text: input.problem, part: "problem" }} {...(input.subject ? { meta: { text: input.subject, part: "subject", role: "body" } } : {})} />
    {photo && input.problemPhoto && <kit.KitPhoto part="photo" photo={input.problemPhoto} label={words.photo} shape="wide" {...{ loading }} />}
    <kit.KitContent density={density} group="response">
      <kit.KitLayoutText density={density} line={{ text: c.stepLine(shown, input.steps.length, lang), part: "progress", role: "body", tone: "muted" }} />
      <kit.KitRowGroup density={density} spacing="groups">
        {input.steps.slice(0, shown).map((row, index) => <Derivation key={row.id} {...{ row, index, density, lang }} />)}
      </kit.KitRowGroup></kit.KitContent>
    {done && <FinalAnswer answer={input.answer} {...{ words, density }} />}
    {!done && <kit.KitActionFooter {...{ density }}>
      <kit.KitAction part={loading ? null : "next"} label={words.next} action="press" />
      <kit.KitAction part={loading ? null : "all"} label={words.all} action="press" kind="quiet" />
      {input.tutorGoto && <kit.KitAction part={loading ? null : "tutor"} kind="quiet" label={words.tutor} action="press" goto={loading ? undefined : input.tutorGoto} />}
    </kit.KitActionFooter>}
    {done && input.tutorGoto && <kit.KitRow part={loading ? null : "tutor"} inline density={density} label={words.tutor} goto={loading ? undefined : input.tutorGoto}>
      <kit.KitLayoutText line={{ text: words.tutor, role: "body", tone: "accent" }} density={density} /></kit.KitRow>}
    {!loading && <Solver {...{ words, density }} />}</>; }

// prettier-ignore
export function WorkedSolution(input: View) {
  const scope = kit.usePartContext(), state = kit.useComponentState();
  const { words: { workedSolution: words } } = kit.useWords(learningWordsFor);
  const density = kit.useVariant("density", meta.variants.density, input.density),
    surface = kit.useVariant("surface", meta.variants.surface, input.surface),
    media = kit.useVariant("media", meta.variants.media, input.media),
    overflow = kit.useVariant("overflow", meta.variants.overflow, input.overflow);
  const live = kit.useLiveControls(meta, input);
  const shown = solutionProgress(input.steps.length, overflow, live.revealedSteps, state);
  const body = <SolutionBody {...{ input, density, shown }} photo={media === "cover"} />;
  const complete = state === "success" || (state === "filled" && shown === input.steps.length);
  const message = state === "error" ? words.error : complete ? words.success : words.empty;
  return <kit.KitCard part="root" padded {...{ surface, density }}>
    <kit.PartContext.Provider value={{ ...scope, state: complete ? "success" : state }}>
      <kit.KitState part="status" {...{ message, density }} icon={state === "error" ? "alert" : "book"} retain={complete} loading={body}>{body}</kit.KitState>
    </kit.PartContext.Provider></kit.KitCard>; }
