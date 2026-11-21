import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { applicantCopy, pipelineCopy, pipelineOutcomes, pipelineReading } from "../copy";
import { hiringWordsFor } from "../lang";
import { activeStages, outcomes, seedDate, seedGoto, seedJobId, seedRows } from "../seeds";

// Core first: List/badge can show a stage label but cannot move active applicants across counted hiring stages.
export const meta = {
  id: "ApplicantPipeline",
  status: "draft",
  group: "data",
  purpose: "Move active applicants between counted hiring stages for one opening.",
  pick: "Only when an employer needs both counted stage lanes and moves between them for one opening. For a flat directory with one tappable row per applicant, use List even if the rows show status badges. Not a generic board (Board) or a seeker's own tracker (Applications).",
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath:
    "Application records live on the phone and the host moves only active applicants between hiring stages.",
  variants: {
    density: ["comfortable", "compact"],
    surface: ["plain", "outlined"],
    arrange: ["strip", "rows"],
  },
  parts: ["root", "title", "stages", "applied", "screening", "interview", "offer", "outcomes"],
  items: {
    key: "applicants",
    parts: ["root", "name", "applied", "next", "next_at"],
    visibleWhen: { outcome: "active" },
    move: { field: "stage", values: activeStages },
  },
  states: ["filled", "empty", "loading", "error"],
  actions: { items: { root: ["press", "move"] }, when: { root: { outcome: "active" } } },
  writeHints: [
    "Write one record per applicant. Stage is the last active stage even for a terminal outcome; do not write stage counts, outcome counts or column objects.",
    'Use arrange "rows" for stages stacked vertically, otherwise null. Leave density and surface null unless requested.',
  ],
  live: {
    derive: ({ applicants }): c.Values => ({
      closed: pipelineOutcomes(applicants as z.output<typeof props>["applicants"]),
    }),
  },
  read: (input, state, lang): string[] => {
    const { applicants, closed } = input as z.output<typeof props> & {
      closed?: ReturnType<typeof pipelineOutcomes>;
    };
    return state === "filled"
      ? pipelineReading(applicants, closed ?? pipelineOutcomes(applicants), lang)
      : [];
  },
} as const satisfies c.Meta;

export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  jobId: c.text(32).meta({ kind: "id" }),
  title: c.text(32),
  applicants: z
    .array(
      z.strictObject({
        applicationId: c.text(32).meta({ kind: "id" }),
        name: c.text(24),
        stage: z.enum(activeStages),
        outcome: z.enum(outcomes),
        applied: c.isoDate,
        next: c.text(36).optional(),
        nextAt: c.isoDate.optional(),
        goto: c.screenId,
      }),
    )
    .min(1)
    .max(20)
    .refine(
      (rows) => new Set(rows.map((row) => row.applicationId)).size === rows.length,
      "Use distinct application IDs",
    ),
});

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  const rows = seedRows(input, 3);
  return {
    jobId: seedJobId,
    title: rows[0]!.title(32),
    applicants: rows.map((row, i) => ({
      applicationId: `application_${i + 1}`,
      name: row.title(24),
      stage: "applied",
      outcome: "active",
      applied: seedDate,
      goto: seedGoto,
    })),
  };
}

// prettier-ignore
export const examples = [
  {
    jobId: "walker",
    title: "Summer dog walker",
    applicants: [
      {
        applicationId: "sam", name: "Sam Patel", stage: "screening", outcome: "active",
        applied: "2027-04-06", next: "Call about group walks", nextAt: "2027-04-10", goto: "sam_review",
      },
      {
        applicationId: "riley", name: "Riley Chen", stage: "interview", outcome: "withdrawn",
        applied: "2027-04-05", goto: "riley_review",
      },
      {
        applicationId: "imani", name: "Imani Cole", stage: "applied", outcome: "active",
        applied: "2027-04-07", next: "Review references", goto: "imani_review",
      },
    ],
  },
  {
    jobId: "baker",
    title: "Morning baker",
    arrange: "rows",
    applicants: [
      {
        applicationId: "mara", name: "Mara Kim", stage: "offer", outcome: "active",
        applied: "2027-05-01", goto: "mara_review",
      },
      {
        applicationId: "ben", name: "Ben Ortiz", stage: "applied", outcome: "active",
        applied: "2027-05-03", goto: "ben_review",
      },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("ApplicantPipeline");
export const probes: c.Probe[] = [
  choose(
    "For one job, group applicants into counted stages from applied to offer. Let me move active applicants and take closed applications off the board.",
  ),
  choose(
    "I need a plain alphabetical directory of people who applied. Give each person one row with their name, a small status badge like Contacted, and a chevron to open their profile. No groups, counts or moving anyone.",
    "List",
  ),
  write(
    "Make a Summer dog walker hiring board. Sam Patel applied 2027-04-06 and is active in screening; next is a call on 2027-04-10. Riley Chen applied 2027-04-05 and withdrew at interview. Link to their reviews.",
  ),
  {
    ...write(
      "For the Morning baker hiring board, stack all hiring stages vertically, one under the other. Mara Kim applied 2027-05-01, is at Offer and still active. Link to her review.",
    ),
    variant: { axis: "arrange", value: "rows" },
  },
  read("Open Sam Patel's application.", { address: "p1/r1", action: "press" }),
  read(
    "Move Sam Patel's card to Interview. Copy the card address and the action word after it from the move bracket, in separate fields. Do not include the destination value.",
    { address: "p1/r1", action: "move" },
  ),
] satisfies c.Probe[];

type ViewProps = c.Props<typeof props, typeof meta>;

// prettier-ignore
function ApplicantText(row: ViewProps["applicants"][number], density: c.ThemeDensity, lang: string) {
  const { applied, next, nextAt } = applicantCopy(row, lang);
  return <kit.KitContent density={density} lineRole="body">
    <kit.KitText part="name" role="body" {...{ density }}>{row.name}</kit.KitText>
    <kit.KitText part="applied" role="caption" tone="muted" {...{ density }}>{applied}</kit.KitText>
    {next && <kit.KitText part="next" role="caption" {...{ density }}>{next}</kit.KitText>}
    {nextAt && <kit.KitText part="next_at" role="caption" tone="muted" {...{ density }}>{nextAt}</kit.KitText>}
  </kit.KitContent>;
}

// prettier-ignore
export function ApplicantPipeline({ title, applicants, density: requested, surface, arrange }: ViewProps) {
  const state = kit.useComponentState(), loading = state === "loading";
  const density = kit.useVariant("density", meta.variants.density, requested);
  const layout = kit.useVariant("arrange", meta.variants.arrange, arrange);
  const thing = kit.useEmptyThing(), { lang, words: { pipeline } } = kit.useWords(hiringWordsFor);
  const { columns, active, outcomeLines, outcomes: summary } = pipelineCopy(applicants, pipelineOutcomes(applicants), lang);
  return <kit.KitCard style="inset" padded {...{ density, surface }}>
    {state === "empty" ? <kit.KitEmpty part="title" icon="briefcase" title={c.emptyLine(thing ?? pipeline.thing, lang)} decorativeIcon /> :
      state === "error" ? <kit.KitEmpty part="title" icon="info" title={pipeline.error} decorativeIcon /> : <>
        {loading ? <kit.KitSkeleton shape="figure" inset="none" density={density} content={[["title", title], ["caption", summary]]} /> :
          <kit.KitContent {...{ density }}><kit.KitText part="title" role="title" {...{ density }}>{title}</kit.KitText>
            <kit.KitText part="outcomes" role="caption" tone="muted" {...{ density }}>{outcomeLines.map(({ id, label, count }, i) =>
              <kit.KitText key={id} part={null} role="caption" tone="muted">{i > 0 && pipeline.separator}{label}<kit.KitText part={null}
                role="number" numberScale="compact" emphasis="strong" tabular {...{ density }}>{count}</kit.KitText></kit.KitText>
            )}</kit.KitText></kit.KitContent>}
        <kit.KitColumns part="stages" {...{ loading }} style={layout === "rows" ? "stack" : "columns"}
          columns={columns.map(({ id, label, count, empty }) => ({
            id, label, count, countPart: id, moveValue: id, headingRole: "body",
            summary: empty && <kit.KitText part={null} role="caption" tone="muted">{pipeline.emptyStage}</kit.KitText>,
          }))}
          move={{ caption: pipeline.move, label: pipeline.destination, reserveTargets: true, inlineCards: true, cards: active.map((row) => ({
            id: row.id, column: activeStages.indexOf(row.stage), label: row.name, goto: row.goto,
            children: ApplicantText(row, density, lang),
          })) }}
        />
      </>}
  </kit.KitCard>;
}
