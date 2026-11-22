import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { FeedRow, type FeedRowData } from "../../../kit/renderers";
import { jobFeedCopy, jobFeedReading } from "../copy";
import { hiringWordsFor } from "../lang";
import { payPeriods, seedDate, seedGoto, seedRows } from "../seeds";
import { prompt } from "../../../entry/prompt-JobFeed.generated";

// Core first: List with a badge trail can link short vacancy rows, but cannot show structured pay,
// workplace, posted age, local bookmarks and easy apply together per opening.
export const meta = {
  id: "JobFeed",
  status: "ready",
  group: "content",
  region: "body",
  weight: 2,
  tier: "phone",
  purpose: prompt.purpose,
  pick: prompt.pick,
  realPath: "Openings and bookmarks can live on the phone; external applications need a job-board service.",
  variants: {
    density: ["comfortable", "compact"],
    surface: ["card", "outlined"],
    detail: ["full", "brief"],
  },
  variantParts: { "detail.brief": { hides: ["place", "posted"] } },
  parts: ["root", "empty", "success", "error"],
  items: {
    key: "jobs",
    parts: [
      "root",
      "card",
      "title",
      "employer",
      "place",
      "workplace",
      "pay",
      "posted",
      "easy_apply",
      "save",
      "apply",
    ],
    toggles: { save: "saved" },
  },
  partTiers: { apply: "service" },
  actions: {
    items: { root: ["press"], save: ["toggle"], apply: ["press"] },
    when: { apply: { easyApply: true } },
    noGoto: { items: ["apply"] },
  },
  states: ["filled", "empty", "loading", "success", "error"],
  readSuccess: true,
  successActions: ["root.press", "save.toggle", "apply.press"],
  live: {
    derive: (value) =>
      value.detail === "brief"
        ? {
            jobs: (value.jobs as z.output<typeof job>[]).map((row) => ({
              ...row,
              place: undefined,
              posted: undefined,
            })),
          }
        : {},
  },
  read: (input, state, lang, _data, currency): string[] => {
    const content = jobFeedReading((input as z.output<typeof props>).jobs, currency, lang);
    return state === "success" ? [hiringWordsFor(lang).jobFeed.success, ...content] : content;
  },
  writeHints: prompt.writeHints,
} as const satisfies c.Meta;

const job = z.strictObject({
  jobId: c.text(32).meta({ kind: "id" }),
  title: c.text(32),
  employer: c.text(32),
  place: c.text(28).optional(),
  workplace: z.enum(["onsite", "hybrid", "remote"]),
  pay: z
    .strictObject({
      min: z.number().min(0),
      max: z.number().min(0),
      per: z.enum(payPeriods),
    })
    .refine(({ min, max }) => min <= max, { path: ["max"] })
    .optional(),
  easyApply: z.boolean(),
  saved: z.boolean(),
  posted: c.isoDate,
  goto: c.screenId,
});
export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  jobs: z
    .array(job)
    .min(1)
    .max(6)
    .refine((rows) => new Set(rows.map(({ jobId }) => jobId)).size === rows.length, "Use unique job IDs"),
  style: z.literal("cards").optional(),
});

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  return {
    jobs: seedRows(input, 6).map(({ title, detail }, index) => ({
      jobId: `job_${index + 1}`,
      title: title(32),
      employer: detail(32),
      workplace: "onsite",
      easyApply: false,
      saved: false,
      posted: seedDate,
      goto: seedGoto,
    })),
  };
}

const openings = [
  {
    jobId: "walker",
    title: "Summer dog walker",
    employer: "Trot",
    place: "North Park",
    workplace: "onsite",
    pay: { min: 18, max: 22, per: "hour" },
    easyApply: true,
    saved: false,
    posted: "2026-11-20",
    goto: "walker_post",
  },
  {
    jobId: "editor",
    title: "Copy editor",
    employer: "Harbour Press",
    workplace: "remote",
    easyApply: false,
    saved: true,
    posted: "2026-11-17",
    goto: "editor_post",
  },
] satisfies z.input<typeof job>[];

export const examples: z.input<typeof props>[] = [
  { jobs: openings },
  { jobs: openings, style: "cards" },
  { jobs: openings, density: "compact", surface: "outlined", detail: "brief" },
];

const { choose, write, read } = c.probesFor("JobFeed");
export const probes = [
  choose("Browse several open jobs by employer, workplace and pay range, and bookmark openings."),
  choose(
    "Show short linked rows with a title, department and chevron. No job terms or save buttons.",
    "List",
  ),
  write(
    "List Trot's Summer dog walker opening, posted 2026-11-20, on-site in North Park, paying 18 to 22 per hour, easy apply on and not saved. Link to walker_post.",
  ),
  {
    ...write(
      "List the open, saved, remote Copy editor job at Harbour Press, posted 2026-11-17, without easy apply. Link to editor_post. Keep the date in the record but hide posting dates and places.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  // Use the brief fixture so relative posting ages do not invalidate replay each day.
  read("Bookmark the Summer dog walker opening.", { address: "j1/r1/save", action: "toggle" }, 2),
] satisfies c.Probe[];

type Feed = c.Props<typeof props, typeof meta>;
type Job = Feed["jobs"][number];
type JobWords = ReturnType<typeof hiringWordsFor>["jobFeed"];
type Copy = ReturnType<typeof jobFeedCopy>;

function jobActions(job: Job, copy: Copy, words: JobWords) {
  return [
    {
      part: "save",
      action: "toggle",
      label: copy.save,
      a11y: (job.saved ? words.unsaveJob : words.saveJob)(job.title),
      icon: job.saved ? "check" : "bookmark",
      kind: "quiet",
    } as const,
    ...(copy.apply
      ? [{ part: "apply", label: copy.apply, a11y: words.applyFor(job.title), kind: "secondary" } as const]
      : []),
  ];
}

function JobBadges({ copy, density }: { copy: Copy; density: c.ThemeDensity }) {
  return (
    <kit.KitContent density={density} rhythm="flush">
      <kit.KitTrail kind="badge" part="workplace" value={copy.workplace} tone="muted" density={density} />
      {copy.easyApply && (
        <kit.KitTrail kind="badge" part="easy_apply" value={copy.easyApply} tone="muted" density={density} />
      )}
    </kit.KitContent>
  );
}

function JobEntry({
  job,
  density,
  surface,
  cards,
  brief,
}: {
  job: Job;
  density: c.ThemeDensity;
  surface: c.AxisValue<"surface">;
  cards: boolean;
  brief: boolean;
}) {
  const context = kit.usePartContext();
  const {
    lang,
    words: { jobFeed: words },
  } = kit.useWords(hiringWordsFor);
  const address = c.formatAddress({ ...context, item: job.id, part: "save" });
  const saved = kit.useControlValue(address, job.saved);
  const copy = jobFeedCopy({ ...job, saved }, kit.useAppCurrency(), lang);
  const row: FeedRowData = {
    item: job.id,
    label: job.title,
    goto: job.goto,
    // Lead with the role in the feed's first text slot, then show its employer.
    author: { part: "title", role: "title", text: job.title },
    time: { part: "employer", role: "meta", text: job.employer, tone: "muted" },
    ...(!brief && {
      title: { part: "posted", role: "meta", tone: "muted", text: copy.posted },
      status: { part: "place", role: "meta", tone: "muted", text: copy.place },
    }),
    body: { part: "pay", role: "figure", compact: true, tabular: true, text: copy.pay, tone: "muted" },
    accessories: jobActions({ ...job, saved }, copy, words),
  };
  const content = (
    <kit.KitGrid fitLast density={density}>
      <FeedRow row={row} density={density} />
      <JobBadges {...{ copy, density }} />
    </kit.KitGrid>
  );
  return (
    <kit.PartContext.Provider value={{ ...context, item: job.id }}>
      {cards ? (
        <kit.KitCard part="card" padded {...{ surface, density }}>
          {content}
        </kit.KitCard>
      ) : (
        content
      )}
    </kit.PartContext.Provider>
  );
}

export function JobFeed({ jobs, style, density: requested, surface: finish, detail }: Feed) {
  const state = kit.useComponentState();
  const density = kit.useVariant("density", meta.variants.density, requested);
  const surface = kit.useVariant("surface", meta.variants.surface, finish);
  const brief = kit.useVariant("detail", meta.variants.detail, detail) === "brief";
  const {
    lang,
    words: { jobFeed: words },
  } = kit.useWords(hiringWordsFor);
  const thing = kit.useEmptyThing();
  const cards = style === "cards";
  const content = (
    <kit.KitRowGroup density={density} separators={!cards} spacing="groups">
      {jobs.map((job) => (
        <JobEntry key={job.id} {...{ job, density, surface, cards, brief }} />
      ))}
    </kit.KitRowGroup>
  );
  const part = state === "empty" || state === "success" || state === "error" ? state : undefined;
  const message = state === "empty" && thing ? c.emptyLine(thing, lang) : part ? words[part] : undefined;
  return (
    <kit.KitCard part="root" style={cards ? "cards" : "inset"} padded={!cards} {...{ density, surface }}>
      <kit.KitState
        part={part ?? null}
        message={message}
        {...(state === "empty" && { icon: "briefcase" as const })}
        loading={content}
        retain={state === "success"}
        density={density}
      >
        {content}
      </kit.KitState>
    </kit.KitCard>
  );
}
