import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { jobAcceptsApplications, jobPostCopy, jobPostReading } from "../copy";
import { hiringWordsFor } from "../lang";
import { payPeriods, seedGoto, seedJobId } from "../seeds";
import { prompt } from "../../../entry/prompt-JobPost.generated";

// Core first: Card/card can spotlight a role but cannot show structured pay terms and an application window.
export const meta = {
  id: "JobPost",
  status: "ready",
  group: "content",
  purpose: prompt.purpose,
  pick: prompt.pick,
  region: "body",
  weight: 2,
  tier: "phone",
  partTiers: { publish: "service" },
  realPath:
    "An opening and its save state live on the phone, while publishing needs a job board or website service.",
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["about"] } },
  // prettier-ignore
  parts: ["root", "title", "employer", "place", "workplace", "contract", "pay", "about", "requirements",
    "closes", "save", "apply", "apply_label", "publish", "publish_label", "success", "error"],
  states: ["filled", "loading", "success", "error"],
  actions: {
    parts: { save: ["toggle"], apply: ["press"], publish: ["press"] },
    when: { apply: { acceptingApplications: true } },
    noGoto: { parts: ["publish"] },
  },
  live: {
    derive: ({ closes, detail }) => ({
      acceptingApplications: jobAcceptsApplications(closes),
      ...(detail === "brief" ? { about: undefined } : {}),
    }),
  },
  read: (input, state, lang, _data, currency): string[] =>
    state === "filled" ? jobPostReading(input as z.output<typeof props>, currency, lang) : [],
  writeHints: prompt.writeHints,
} as const satisfies c.Meta;

export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  jobId: c.text(32).meta({ kind: "id" }),
  title: c.text(32),
  employer: c.text(32),
  place: c.text(36).optional(),
  workplace: z.enum(["onsite", "hybrid", "remote"]),
  contract: z.enum(["permanent", "fixed_term", "casual", "volunteer"]),
  pay: z
    .strictObject({
      min: z.number().min(0),
      max: z.number().min(0),
      per: z.enum(payPeriods),
    })
    .refine(({ min, max }) => min <= max, "Pay minimum cannot exceed maximum")
    .optional(),
  about: c.text(400),
  requirements: z.array(c.text(80)).min(1).max(6),
  closes: c.isoDate.optional(),
  saved: z.boolean(),
  goto: c.screenId,
});

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const [row] = c.itemsOf(cast, 1);
  const neutral = c.wordsFor(lang).placeholderDetail;
  const detail = (max: number) => (row && c.detailOf(row, max, thing)) ?? c.clip(neutral, max);
  return {
    jobId: seedJobId,
    title: (row && c.titleOf(row, 32, thing)) ?? c.clip(c.placeholderTitle(0, lang), 32),
    employer: detail(32),
    workplace: "onsite",
    contract: "casual",
    about: detail(400),
    requirements: [detail(80)],
    saved: false,
    goto: seedGoto,
  };
}

export const examples: z.input<typeof props>[] = [
  {
    jobId: "walker",
    title: "Summer dog walker",
    employer: "Trot",
    place: "North Park",
    workplace: "onsite",
    contract: "fixed_term",
    pay: { min: 18, max: 22, per: "hour" },
    about: "Lead weekday group walks and give each owner a short update.",
    requirements: ["Experience handling groups of dogs", "Available weekday mornings"],
    closes: "2027-04-30",
    saved: false,
    goto: "apply",
  },
  {
    jobId: "editor",
    title: "Copy editor",
    employer: "Harbour Press",
    workplace: "remote",
    contract: "permanent",
    about: "Edit two short newsletters each week.",
    requirements: ["A recent editing sample"],
    closes: "2026-10-01",
    saved: true,
    goto: "editor_apply",
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("JobPost");
export const probes: c.Probe[] = [
  choose(
    "Show one job opening with an hourly pay range, work arrangement, requirements, an apply link and a closing date.",
  ),
  choose(
    "On the welcome screen, put a tappable preview with one photo, the role title and a one-line teaser. The entire preview opens a separate details screen; don't show pay, requirements or application controls here.",
    "Card",
  ),
  write(
    "Post Trot's on-site, fixed-term Summer dog walker role in North Park, paying 18 to 22 an hour. Lead weekday group walks; group handling experience is required. Closes 2027-04-30. It is not saved; link to the apply form.",
  ),
  {
    ...write(
      "Show Harbour Press's permanent remote Copy editor opening. Keep 'Edit two short newsletters each week.' in the record, but don't display the job description. Ask for a recent editing sample, mark the posting saved and link to the application form.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Bookmark this opening on my phone.", { address: "j1/save", action: "toggle" }),
] satisfies c.Probe[];

type Job = c.Props<typeof props, typeof meta>;
type Density = c.ThemeDensity;

// prettier-ignore
function JobActions({ input, open, loading, density }: { input: Job; open: boolean; loading: boolean; density: Density }) {
  const { words: { jobPost: words } } = kit.useWords(hiringWordsFor);
  return <kit.KitContent group="response" {...{ density }}>
    <kit.KitRow label={words.save} inline {...{ density }}
      trailing={<kit.KitTrail kind="toggle" part="save" on={input.saved} />}>
      {loading ? <kit.KitSkeleton shape="figure" inset="none" content={[["label", words.save]]} {...{ density }} /> :
        <kit.KitText part={null} role="label" {...{ density }}>{words.save}</kit.KitText>}
    </kit.KitRow>
    {open && (loading ? <kit.KitSkeleton shape="control" label={words.apply} kind="secondary" full /> :
      <kit.KitAction part="apply" label={words.apply} goto={input.goto} kind="secondary" full />)}
    <kit.KitContent group="response" {...{ density }}>
      {loading ? <kit.KitSkeleton shape="control" label={words.publish} kind="quiet" full /> :
        <kit.KitAction part="publish" label={words.publish} kind="quiet" full />}
    </kit.KitContent>
  </kit.KitContent>;
}

// prettier-ignore
export function JobPost(input: Job) {
  const state = kit.useComponentState(), loading = state === "loading";
  const density = kit.useKit().density;
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const { lang, words: { jobPost: words } } = kit.useWords(hiringWordsFor);
  const copy = jobPostCopy(input, kit.useAppCurrency(), lang);
  const line = (part: string | null, value: string | undefined, role: kit.TextRole, tone: kit.TextTone = "text") =>
    value === undefined ? null : loading ?
      <kit.KitSkeleton shape="figure" inset="none" content={[[role, value, "start", "compact"]]} {...{ density }} /> :
      <kit.KitText {...{ part, role, tone, density }} numberScale="compact" tabular={role === "number"}>{value}</kit.KitText>;
  return <kit.KitCard part="root" padded density={density}>
    {state === "success" || state === "error" ? <kit.KitEmpty part={state} decorativeIcon
      title={words[state]} icon={state === "success" ? "check" : "info"} /> : <>
      <kit.KitContent {...{ density }}>
        {line("title", input.title, "title")}
        {line("employer", input.employer, "body")}
        {line("place", input.place, "label", "muted")}
      </kit.KitContent>
      <kit.KitContent group="response" {...{ density }}>
        {loading ? line(null, [copy.workplace, copy.contract].join(words.termSeparator), "label") :
          <kit.KitText part="workplace" role="label" tone="muted" {...{ density }}>
            {copy.workplace}{words.termSeparator}{line("contract", copy.contract, "label", "muted")}
          </kit.KitText>}
        {line("pay", copy.pay, "number")}
      </kit.KitContent>
      {detail === "full" && <kit.KitContent group="response" {...{ density }}>
        {line("about", input.about, "body")}
      </kit.KitContent>}
      <kit.KitContent group="response" {...{ density }}>
        {line("requirements", words.requirements, "label", "muted")}
        {copy.requirements.map((requirement, index) =>
          <kit.KitContent key={index} {...{ density }}>{line(null, requirement, "body")}</kit.KitContent>)}
      </kit.KitContent>
      {copy.closes && <kit.KitContent group="response" {...{ density }}>
        {line("closes", copy.closes, "label", copy.open ? "muted" : "warn")}
      </kit.KitContent>}
      <JobActions {...{ input, loading, density }} open={copy.open} />
    </>}
  </kit.KitCard>;
}
