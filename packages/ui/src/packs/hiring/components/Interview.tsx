import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { interviewActions, interviewCopy, interviewPrep, interviewReading } from "../copy";
import { hiringWordsFor } from "../lang";
import { seedApplicationId, seedDate, seedGoto, seedRows, seedTime } from "../seeds";
import { prompt } from "../../../entry/prompt-Interview.generated";

const httpsUrl = z.url({ protocol: /^https$/, hostname: /.+/ });

// Core first: Timeline/hours shows a day's meetings but cannot show one linked interview's lifecycle and actions.
export const meta = {
  id: "Interview",
  status: "ready",
  group: "content",
  purpose: prompt.purpose,
  pick: prompt.pick,
  region: "body",
  weight: 2,
  tier: "phone",
  partTiers: { invite: "service", join: "service" },
  realPath:
    "The phone holds the agreed meeting record, while sending invitations and opening call links need outside services.",
  // prettier-ignore
  parts: ["root", "candidate", "role", "date", "time", "duration", "format", "place", "interviewers",
    "status", "past", "link", "edit", "edit_label", "cancel", "cancel_label", "complete", "complete_label",
    "invite", "invite_label", "join", "join_label", "success", "error", "prep", "reschedule", "reschedule_label"],
  confirmParts: ["cancel"],
  states: ["filled", "loading", "success", "error"],
  actions: {
    parts: {
      edit: ["press"],
      cancel: ["press"],
      complete: ["press"],
      invite: ["send"],
      join: ["press"],
      reschedule: ["press"],
    },
    when: {
      edit: { open: true },
      cancel: { open: true },
      complete: { status: "confirmed" },
      invite: { open: true },
      join: { joinable: true },
      reschedule: { open: true },
    },
    noGoto: { parts: ["cancel", "complete", "join"] },
  },
  live: {
    derive: ({ status, link, rescheduleGoto }) => ({
      ...interviewActions(status, typeof link === "string"),
      reschedule: rescheduleGoto ? { goto: rescheduleGoto } : undefined,
    }),
  },
  read: (input, state, lang): string[] =>
    state === "filled" ? interviewReading(input as z.output<typeof props>, lang) : [],
  writeHints: prompt.writeHints,
} as const satisfies c.Meta;

export const props = z.strictObject({
  interviewId: c.text(32).meta({ kind: "id" }),
  applicationId: c.text(32).meta({ kind: "id" }),
  candidate: c.text(24),
  role: c.text(32),
  date: c.isoDate,
  time: c.clock,
  minutes: z.int().min(5).max(240),
  format: z.enum(["in_person", "phone", "video"]),
  place: c.text(36).optional(),
  link: c
    .text(200)
    .refine((value) => /^https:\/\//i.test(value) && httpsUrl.safeParse(value).success, "Use an HTTPS URL")
    .meta({ kind: "url" })
    .optional(),
  interviewers: z.array(c.text(24)).min(1).max(6),
  status: z.enum(["proposed", "confirmed", "completed", "cancelled"]),
  goto: c.screenId,
  rescheduleGoto: c.screenId.optional(),
  style: z.literal("checklist").optional(),
  prep: z.array(c.text(80)).min(1).max(6).optional(),
});

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  const [row] = seedRows(input, 1);
  return {
    interviewId: "interview_1",
    applicationId: seedApplicationId,
    candidate: row!.title(24),
    role: row!.detail(32),
    date: seedDate,
    time: seedTime,
    minutes: 30,
    format: "in_person",
    interviewers: [c.placeholderTitle(1, input.lang)],
    status: "proposed",
    goto: seedGoto,
  };
}

export const examples = [
  {
    interviewId: "sam_meeting",
    applicationId: "sam",
    candidate: "Sam Patel",
    role: "Summer dog walker",
    date: "2027-04-12",
    time: "09:30",
    minutes: 30,
    format: "in_person",
    place: "North Park entrance",
    interviewers: ["Jo Ellis", "Ari Lane"],
    status: "confirmed",
    goto: "interview_edit",
  },
  {
    interviewId: "mara_meeting",
    applicationId: "mara",
    candidate: "Mara Kim",
    role: "Morning baker",
    date: "2027-05-06",
    time: "15:00",
    minutes: 45,
    format: "video",
    link: "https://meet.example.org/bakery",
    interviewers: ["Ruth Bell"],
    status: "proposed",
    goto: "mara_edit",
  },
  {
    interviewId: "sam_followup",
    applicationId: "sam",
    candidate: "Sam Patel",
    role: "Summer dog walker",
    date: "2027-04-20",
    time: "09:30",
    minutes: 30,
    format: "phone",
    interviewers: ["Jo Ellis"],
    status: "confirmed",
    goto: "followup_edit",
    rescheduleGoto: "followup_reschedule",
    style: "checklist",
    prep: ["Read the application notes", "Prepare a question about group walks"],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Interview");
export const probes: c.Probe[] = [
  choose(
    "Show one applicant's confirmed job interview, its agreed time and duration, meeting format, interviewers, and ways to edit, invite or cancel.",
  ),
  choose(
    "I need a time rail of today's three interviews, showing start and end times down the day, not controls for individual meetings.",
    "Timeline",
  ),
  write(
    "Sam Patel's confirmed Summer dog walker interview is in person at North Park entrance, 2027-04-12 at 09:30 for 30 minutes, with Jo Ellis and Ari Lane. Link to edit the meeting.",
  ),
  {
    ...write(
      "Sam Patel's confirmed Summer dog walker interview is by phone on 2027-04-20 at 09:30 for 30 minutes with Jo Ellis. Link to edit it. Include a prep checklist: Read the application notes; Prepare a question about group walks.",
    ),
    expectProps: {
      style: "checklist",
      prep: ["Read the application notes", "Prepare a question about group walks"],
    },
  },
  {
    ...write(
      "Sam Patel's confirmed Summer dog walker interview is by phone on 2027-04-20 at 09:30 for 30 minutes with Jo Ellis. Link Edit to followup_edit and add a separate Reschedule link opening followup_reschedule.",
    ),
    expectProps: { goto: "followup_edit", rescheduleGoto: "followup_reschedule" },
  },
  read("Open the form to edit this interview.", { address: "i1/edit", action: "press" }),
] satisfies c.Probe[];

type Meeting = c.Props<typeof props, typeof meta>;

function MeetingActions({
  input,
  density,
  loading,
}: {
  input: Meeting;
  density: c.ThemeDensity;
  loading: boolean;
}) {
  const {
    words: { interview: words },
  } = kit.useWords(hiringWordsFor);
  const { open, joinable } = interviewActions(input.status, input.link !== undefined);
  if (!open) return null;
  const action = (part: keyof typeof words.actions, kind: kit.ActionKind, goto?: string) =>
    loading ? (
      <kit.KitSkeleton shape="control" label={words.actions[part]} {...{ kind }} full />
    ) : (
      <kit.KitAction
        label={words.actions[part]}
        action={part === "invite" ? "send" : "press"}
        {...{ part, kind, goto }}
        full
      />
    );
  const edit = action("edit", "secondary", input.goto);
  return (
    <kit.KitContent group="response" {...{ density }}>
      <kit.KitGrid arrange="rows" list listRowGap="cards" {...{ density }}>
        {joinable && action("join", "primary")}
        {input.rescheduleGoto ? (
          <kit.KitGrid density={density}>
            {edit}
            {action("reschedule", "secondary", input.rescheduleGoto)}
          </kit.KitGrid>
        ) : null}
        <kit.KitGrid {...{ density }}>
          {!input.rescheduleGoto && edit}
          {action("invite", "secondary")}
          {input.rescheduleGoto && action("cancel", "danger")}
        </kit.KitGrid>
        {(!input.rescheduleGoto || input.status === "confirmed") && (
          <kit.KitGrid {...{ density }}>
            {!input.rescheduleGoto && action("cancel", "danger")}
            {input.status === "confirmed" && action("complete", "quiet")}
          </kit.KitGrid>
        )}
      </kit.KitGrid>
    </kit.KitContent>
  );
}

function PrepGuide({ input, density }: { input: Meeting; density: c.ThemeDensity }) {
  const {
    words: { interview: words },
  } = kit.useWords(hiringWordsFor);
  const loading = kit.useComponentState() === "loading";
  const steps = interviewPrep(input);
  if (!steps) return null;
  return (
    <kit.KitContent group="response" rhythm="flush" density={density}>
      <kit.KitLayoutText line={{ part: "prep", text: words.prep, role: "meta" }} density={density} />
      <kit.KitRowGroup density={density}>
        {steps.map((step, index) => (
          <kit.KitRow
            key={index}
            part={null}
            label={step}
            inset="none"
            inline
            leading={<kit.KitIcon name="square" decorative loading={loading} />}
            density={density}
          >
            <kit.KitLayoutText line={{ text: step }} density={density} />
          </kit.KitRow>
        ))}
      </kit.KitRowGroup>
    </kit.KitContent>
  );
}

function MeetingDetails({
  input,
  density,
  copy,
}: {
  input: Meeting;
  density: c.ThemeDensity;
  copy: ReturnType<typeof interviewCopy>;
}) {
  return (
    <kit.KitContent group="response" density={density}>
      <kit.KitGrid density={density}>
        <kit.KitContent density={density}>
          <kit.KitLayoutText line={{ part: "date", text: copy.date }} density={density} />
          <kit.KitFigure value={{ part: "time", text: copy.time, compact: true }} density={density} />
          <kit.KitLayoutText
            line={{ part: "duration", text: copy.duration, role: "meta", tone: "muted" }}
            density={density}
          />
          <kit.KitLayoutText
            line={{ part: "past", text: copy.past, role: "meta", tone: "muted" }}
            density={density}
          />
        </kit.KitContent>
        <kit.KitContent density={density}>
          <kit.KitLayoutText line={{ part: "format", text: copy.format }} density={density} />
          <kit.KitLayoutText line={{ part: "place", text: input.place, role: "meta" }} density={density} />
          <kit.KitLayoutText
            line={{ part: "link", text: copy.link, role: "meta", tone: "muted" }}
            density={density}
          />
        </kit.KitContent>
      </kit.KitGrid>
      <kit.KitLayoutText line={{ part: "interviewers", text: copy.interviewers }} density={density} />
    </kit.KitContent>
  );
}

function MeetingBody({ input, density }: { input: Meeting; density: c.ThemeDensity }) {
  const { lang } = kit.useWords(hiringWordsFor);
  const loading = kit.useComponentState() === "loading";
  const copy = interviewCopy(input, lang);
  return (
    <>
      <kit.KitHeader
        title={{ part: "candidate", text: input.candidate }}
        meta={[
          { part: "role", text: input.role, role: "body" },
          { part: "status", text: copy.status, tone: input.status === "confirmed" ? "good" : "muted" },
        ]}
        density={density}
      />
      <MeetingDetails {...{ input, copy, density }} />
      <PrepGuide {...{ input, density }} />
      <MeetingActions {...{ input, density, loading }} />
    </>
  );
}

export function Interview(input: Meeting) {
  const state = kit.useComponentState();
  const {
    words: { interview: words },
  } = kit.useWords(hiringWordsFor);
  const density = kit.useKit().density;
  const body = <MeetingBody {...{ input, density }} />;
  return (
    <kit.KitCard part="root" padded density={density}>
      <kit.KitState
        density={density}
        loading={body}
        part={state === "success" || state === "error" ? state : null}
        message={state === "success" || state === "error" ? words[state] : undefined}
      >
        {body}
      </kit.KitState>
    </kit.KitCard>
  );
}
