import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { applicationCopy, applicationsReading, projectApplications } from "../copy";
import { hiringWordsFor } from "../lang";
import { activeStages, outcomes, seedDate, seedGoto, seedRows } from "../seeds";
import { prompt } from "../../../entry/prompt-Applications.generated";

// Core first: List/badge shows status but cannot track and log a dated follow-up on a job application.
export const meta = {
  id: "Applications",
  status: "ready",
  group: "data",
  purpose: prompt.purpose,
  pick: prompt.pick,
  region: "body",
  weight: 2,
  tier: "phone",
  realPath:
    "Applications and contact events live on the seeker's phone, and checking a follow-up logs and clears it without sending or changing stage.",
  variants: { surface: ["plain", "card"], density: ["comfortable", "compact"] },
  parts: ["root", "empty", "success", "error"],
  items: {
    key: "applications",
    // prettier-ignore
    parts: ["root", "role", "employer", "stage", "outcome", "applied", "last_contact", "next", "next_at",
      "due", "followup", "followup_label", "withdraw", "withdraw_label"],
  },
  confirmParts: ["withdraw"],
  states: ["filled", "empty", "loading", "success", "error"],
  actions: {
    items: { root: ["press"], followup: ["check"], withdraw: ["press"] },
    when: { followup: { followUp: "pending" }, withdraw: { outcome: "active" } },
    noGoto: { items: ["withdraw"] },
  },
  live: {
    derive: ({ applications }): c.Values => ({
      applications: projectApplications(applications as z.output<typeof props>["applications"]),
    }),
  },
  read: (input, state, lang): string[] =>
    state === "filled" ? applicationsReading((input as z.output<typeof props>).applications, lang) : [],
  writeHints: prompt.writeHints,
} as const satisfies c.Meta;

// prettier-ignore
const application = z
  .strictObject({
    applicationId: c.text(32).meta({ kind: "id" }), role: c.text(32), employer: c.text(32),
    stage: z.enum(["saved", ...activeStages]), outcome: z.enum(outcomes),
    applied: c.isoDate.optional(), lastContact: c.isoDate.optional(),
    next: c.text(36).optional(), nextAt: c.isoDate.optional(), goto: c.screenId,
  })
  .refine(
    ({ stage, applied }) => stage !== "saved" || applied === undefined,
    "Saved roles have no applied date",
  )
  .refine(
    ({ next, nextAt }) => nextAt === undefined || next !== undefined,
    "A follow-up date needs a next action",
  );

export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  applications: z
    .array(application)
    .min(1)
    .max(6)
    .refine(
      (rows) => new Set(rows.map((row) => row.applicationId)).size === rows.length,
      "Use distinct application IDs",
    ),
});

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  const [row] = seedRows(input, 1);
  return {
    applications: [
      {
        applicationId: "application_1",
        role: row!.title(32),
        employer: row!.detail(32),
        stage: "applied",
        outcome: "active",
        applied: seedDate,
        goto: seedGoto,
      },
    ],
  };
}

// prettier-ignore
export const examples = [
  {
    applications: [
      {
        applicationId: "trot", role: "Summer dog walker", employer: "Trot", stage: "interview",
        outcome: "active", applied: "2027-04-06", lastContact: "2027-04-12",
        next: "Send a thank-you note", nextAt: "2027-04-13", goto: "trot_application",
      },
      {
        applicationId: "coast", role: "Assistant trainer", employer: "Coast Dogs",
        stage: "saved", outcome: "active", goto: "coast_application",
      },
    ],
  },
  {
    surface: "card",
    density: "compact",
    applications: [
      {
        applicationId: "press", role: "Copy editor", employer: "Harbour Press", stage: "screening",
        outcome: "rejected", applied: "2027-05-01", lastContact: "2027-05-08", goto: "press_application",
      },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Applications");
export const probes: c.Probe[] = [
  choose(
    "Track my applications to several employers, with hiring stage, last contact and a dated follow-up I can log against each role.",
  ),
  choose(
    "Show three employers in one flat vertical list, with a role title, a static status badge and a detail link on each row. Do not group by stage, move records, or show follow-up dates, contact history or logging.",
    "List",
  ),
  write(
    "Track my active Trot Summer dog walker application, submitted 2027-04-06, in interview, last contact 2027-04-12, with a thank-you note due 2027-04-13. Also show the saved Assistant trainer opening at Coast Dogs, not applied. Link each role to its details.",
  ),
  {
    ...write(
      "Show my active Trot Summer dog walker application in its own card, not a plain row. I applied 2027-04-06, reached interview, and need to send a thank-you note by 2027-04-13. Link to my application.",
    ),
    variant: { axis: "surface", value: "card" },
  },
  read("Mark the thank-you follow-up for Trot done without sending anything.", {
    address: "a1/r1/followup",
    action: "check",
  }),
] satisfies c.Probe[];

type Tracker = c.Props<typeof props, typeof meta>;
type Row = ReturnType<typeof projectApplications<Tracker["applications"][number]>>[number];

// prettier-ignore
function ApplicationRow({ row, density, surface, loading }: { row: Row; density: c.ThemeDensity; surface: Tracker["surface"]; loading: boolean }) {
  const { lang, words: { applications: words } } = kit.useWords(hiringWordsFor);
  const copy = applicationCopy(row, lang);
  const line = (part: string, value: string | undefined, role: kit.TextRole = "label", tone: kit.TextTone = "muted") =>
    value === undefined ? null : loading ? <kit.KitSkeleton shape="figure" inset="none" content={[[role, value]]} {...{ density }} />
      : <kit.KitText {...{ part, role, tone, density }}>{value}</kit.KitText>;
  return <kit.KitRow item={row.id} part={null} label={row.role} inline={surface === "plain"} {...{ density, surface }}>
    {loading ? <kit.KitSkeleton shape="rows" inset="none" rows={1} lead="none" {...{ density }}
      items={[{ title: row.role, sub: row.employer, trail: "chevron" }]} /> :
      <kit.KitRow inline label={row.role} part="root" goto={row.goto} lineRole="heading" {...{ density }}
        trailing={<kit.KitIcon name="chevron_right" decorative tone="muted" />}>
        {line("role", row.role, "heading", "text")}{line("employer", row.employer, "body")}
      </kit.KitRow>}
    <kit.KitContent {...{ density }}>
      {line("stage", copy.stage, "label", copy.outcome ? "muted" : "text")}
      {line("outcome", copy.outcome, "label", row.outcome === "hired" ? "good" : row.outcome === "rejected" ? "bad" : "text")}
      {line("applied", copy.applied)}{line("last_contact", copy.lastContact)}
    </kit.KitContent>
    {row.next && <kit.KitContent group="response" {...{ density }}>
      {line("next", row.next, "body", "text")}{line("next_at", copy.nextAt)}
      {line("due", copy.due, "label", "warn")}
      {row.followUp === "pending" && (loading ? <kit.KitSkeleton shape="rows" rows={1} inset="none" lead="box" {...{ density }}
        items={[{ title: words.log }]} />
        : <kit.KitRow inline part={null} label={words.log} leading={<kit.KitCheck part="followup" label={words.log} done={false} />}>
          <kit.KitText part="followup_label" role="label" tone="accent" {...{ density }}>{words.log}</kit.KitText>
        </kit.KitRow>)}
    </kit.KitContent>}
    {row.outcome === "active" && (loading ? <kit.KitSkeleton shape="figure" inset="none" content={[["label", copy.withdraw]]} {...{ density }} />
      : <kit.KitRow part="withdraw" role="button" inline label={copy.withdraw} {...{ density }}>
        <kit.KitText part="withdraw_label" role="label" tone="muted" {...{ density }}>{copy.withdraw}</kit.KitText>
      </kit.KitRow>)}
  </kit.KitRow>;
}

// prettier-ignore
export function Applications(input: Tracker) {
  const state = kit.useComponentState();
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const { words: { applications: words } } = kit.useWords(hiringWordsFor);
  const { applications } = kit.useLiveControls(meta, input) as { applications: Row[] };
  return <kit.KitCard part="root" style={surface === "plain" ? "inset" : "plain"} padded={surface === "plain"} {...{ density }}>
    {state === "empty" ? <kit.KitEmpty part="empty" decorativeIcon icon="briefcase" /> :
      state === "success" || state === "error" ? <kit.KitEmpty part={state} decorativeIcon
        title={state === "success" ? words.success : words.error} icon={state === "success" ? "check" : "info"} /> :
      <kit.KitGrid arrange="rows" list listRowGap={surface === "plain" ? "group" : "cards"} {...{ density }}>
        {applications.map((row) => <ApplicationRow key={row.id} {...{ row, density, surface }} loading={state === "loading"} />)}
      </kit.KitGrid>}
  </kit.KitCard>;
}
