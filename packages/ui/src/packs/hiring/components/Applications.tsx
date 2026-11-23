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

export const examples = [
  {
    applications: [
      {
        applicationId: "trot",
        role: "Summer dog walker",
        employer: "Trot",
        stage: "interview",
        outcome: "active",
        applied: "2027-04-06",
        lastContact: "2027-04-12",
        next: "Send a thank-you note",
        nextAt: "2027-04-13",
        goto: "trot_application",
      },
      {
        applicationId: "coast",
        role: "Assistant trainer",
        employer: "Coast Dogs",
        stage: "saved",
        outcome: "active",
        goto: "coast_application",
      },
    ],
  },
  {
    applications: [
      {
        applicationId: "press",
        role: "Copy editor",
        employer: "Harbour Press",
        stage: "screening",
        outcome: "rejected",
        applied: "2027-05-01",
        lastContact: "2027-05-08",
        goto: "press_application",
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
  read("Mark the thank-you follow-up for Trot done without sending anything.", {
    address: "a1/r1/followup",
    action: "check",
  }),
] satisfies c.Probe[];

type Tracker = c.Props<typeof props, typeof meta>;
type Row = ReturnType<typeof projectApplications<Tracker["applications"][number]>>[number];

function CreateApplicationLine(density: c.ThemeDensity, loading: boolean) {
  return (
    part: string,
    value: string | undefined,
    role: kit.TextRole = "label",
    tone: kit.TextTone = "muted",
  ) =>
    value === undefined ? null : loading ? (
      <kit.KitSkeleton shape="figure" inset="none" content={[[role, value]]} {...{ density }} />
    ) : (
      <kit.KitText {...{ part, role, tone, density }}>{value}</kit.KitText>
    );
}

function ApplicationHeading(
  row: Row,
  density: c.ThemeDensity,
  loading: boolean,
  line: ReturnType<typeof CreateApplicationLine>,
) {
  return (
    <kit.KitRow
      inline
      label={row.role}
      part={loading ? null : "root"}
      goto={loading ? undefined : row.goto}
      lineRole="heading"
      {...{ density }}
      trailing={<kit.KitIcon name="chevron_right" decorative tone="muted" loading={loading} />}
    >
      {line("role", row.role, "heading", "text")}
      {line("employer", row.employer, "body")}
    </kit.KitRow>
  );
}

function ApplicationFollowUp(
  row: Row,
  copy: ReturnType<typeof applicationCopy>,
  density: c.ThemeDensity,
  loading: boolean,
  log: string,
  line: ReturnType<typeof CreateApplicationLine>,
) {
  return (
    <kit.KitContent {...{ density }}>
      {line("next", row.next, "body", "text")}
      {line("next_at", copy.nextAt)}
      {line("due", copy.due, "label", "warn")}
      {row.followUp === "pending" &&
        (loading ? (
          <kit.KitSkeleton
            shape="rows"
            rows={1}
            inset="none"
            lead="box"
            {...{ density }}
            items={[{ title: log }]}
          />
        ) : (
          <kit.KitRow
            inline
            part={null}
            label={log}
            leading={<kit.KitCheck part="followup" label={log} done={false} />}
          >
            <kit.KitText part="followup_label" role="label" tone="accent" {...{ density }}>
              {log}
            </kit.KitText>
          </kit.KitRow>
        ))}
    </kit.KitContent>
  );
}

function ApplicationWithdraw(label: string, density: c.ThemeDensity, loading: boolean) {
  return (
    <kit.KitRow
      inline
      part={loading ? null : "withdraw"}
      role={loading ? "text" : "button"}
      {...{ label, density }}
    >
      <kit.KitLayoutText
        line={{ part: "withdraw_label", text: label, role: "meta", tone: "muted" }}
        density={density}
      />
    </kit.KitRow>
  );
}

type ApplicationRowProps = { row: Row; density: c.ThemeDensity; surface: c.SurfaceFinish; loading: boolean };

function ApplicationRow({ row, density, surface, loading }: ApplicationRowProps) {
  const {
    lang,
    words: { applications: words },
  } = kit.useWords(hiringWordsFor);
  const copy = applicationCopy(row, lang);
  const line = CreateApplicationLine(density, loading);
  return (
    <kit.KitRow
      item={row.id}
      part={null}
      label={row.role}
      inline={surface === "plain"}
      {...{ density, surface }}
    >
      {ApplicationHeading(row, density, loading, line)}
      <kit.KitContent {...{ density }}>
        {line(
          "outcome",
          copy.outcome,
          "label",
          row.outcome === "hired" ? "good" : row.outcome === "rejected" ? "bad" : "text",
        )}
        {line("stage", copy.stage, "label", copy.outcome ? "muted" : "text")}
        {line("applied", copy.applied)}
        {line("last_contact", copy.lastContact)}
      </kit.KitContent>
      {row.next && ApplicationFollowUp(row, copy, density, loading, words.log, line)}
      {row.outcome === "active" && ApplicationWithdraw(copy.withdraw, density, loading)}
    </kit.KitRow>
  );
}

export function Applications(input: Tracker) {
  const state = kit.useComponentState();
  const density = kit.useKit().density;
  const surface = "plain";
  const {
    words: { applications: words },
  } = kit.useWords(hiringWordsFor);
  const { applications } = kit.useLiveControls(meta, input) as { applications: Row[] };
  return (
    <kit.KitCard
      part="root"
      style={surface === "plain" ? "inset" : "plain"}
      padded={surface === "plain"}
      {...{ density }}
    >
      {state === "empty" ? (
        <kit.KitEmpty part="empty" decorativeIcon icon="briefcase" />
      ) : state === "success" || state === "error" ? (
        <kit.KitEmpty
          part={state}
          decorativeIcon
          title={state === "success" ? words.success : words.error}
          icon={state === "success" ? "check" : "info"}
        />
      ) : (
        <kit.KitRowGroup spacing="groups" {...{ density }}>
          {applications.map((row) => (
            <ApplicationRow key={row.id} {...{ row, density, surface }} loading={state === "loading"} />
          ))}
        </kit.KitRowGroup>
      )}
    </kit.KitCard>
  );
}
