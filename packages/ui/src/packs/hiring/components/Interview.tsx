import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { interviewActions, interviewCopy, interviewReading } from "../copy";
import { hiringWordsFor } from "../lang";
import { seedApplicationId, seedDate, seedGoto, seedRows, seedTime } from "../seeds";

const httpsUrl = z.url({ protocol: /^https$/, hostname: /.+/ });

// Core first: Timeline/hours shows a day's meetings but cannot show one linked interview's lifecycle and actions.
export const meta = {
  id: "Interview",
  status: "ready",
  group: "content",
  purpose: "View and manage one job interview already arranged for an applicant.",
  pick: "One arranged hiring interview with interviewers, time, format, link and confirmation or cancellation. Not a day's agenda (Timeline), available times (Slots), or a service appointment (Appointment).",
  region: "body",
  weight: 2,
  tier: "phone",
  partTiers: { invite: "service", join: "service" },
  realPath:
    "The phone holds the agreed meeting record, while sending invitations and opening call links need outside services.",
  // prettier-ignore
  parts: ["root", "candidate", "role", "date", "time", "duration", "format", "place", "interviewers",
    "status", "past", "link", "edit", "edit_label", "cancel", "cancel_label", "complete", "complete_label",
    "invite", "invite_label", "join", "join_label", "success", "error"],
  confirmParts: ["cancel"],
  states: ["filled", "loading", "success", "error"],
  actions: {
    parts: { edit: ["press"], cancel: ["press"], complete: ["press"], invite: ["send"], join: ["press"] },
    when: {
      edit: { open: true },
      cancel: { open: true },
      complete: { status: "confirmed" },
      invite: { open: true },
      join: { joinable: true },
    },
    noGoto: { parts: ["cancel", "complete", "join"] },
  },
  live: {
    derive: ({ status, link }) => interviewActions(status, typeof link === "string"),
  },
  read: (input, state, lang): string[] =>
    state === "filled" ? interviewReading(input as z.output<typeof props>, lang) : [],
  writeHints: [
    "Use the agreed local date and 24-hour time, plus minutes; do not write a calculated end time or past flag. Link is optional and must use HTTPS.",
  ],
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

// prettier-ignore
export const examples = [
  {
    interviewId: "sam_meeting", applicationId: "sam", candidate: "Sam Patel", role: "Summer dog walker",
    date: "2027-04-12", time: "09:30", minutes: 30, format: "in_person", place: "North Park entrance",
    interviewers: ["Jo Ellis", "Ari Lane"], status: "confirmed", goto: "interview_edit",
  },
  {
    interviewId: "mara_meeting", applicationId: "mara", candidate: "Mara Kim", role: "Morning baker",
    date: "2027-05-06", time: "15:00", minutes: 45, format: "video", link: "https://meet.example.org/bakery",
    interviewers: ["Ruth Bell"], status: "proposed", goto: "mara_edit",
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
  read("Open the form to edit this interview.", { address: "i1/edit", action: "press" }),
] satisfies c.Probe[];

type Meeting = c.Props<typeof props, typeof meta>;

// prettier-ignore
function MeetingActions({ input, density, loading }: { input: Meeting; density: c.ThemeDensity; loading: boolean }) {
  const { words: { interview: words } } = kit.useWords(hiringWordsFor);
  const { open, joinable } = interviewActions(input.status, input.link !== undefined);
  if (!open) return null;
  const action = (part: keyof typeof words.actions, kind: kit.ActionKind, goto?: string) =>
    loading ? <kit.KitSkeleton shape="control" label={words.actions[part]} {...{ kind }} full /> :
      <kit.KitAction label={words.actions[part]} action={part === "invite" ? "send" : "press"} {...{ part, kind, goto }} full />;
  return <kit.KitContent group="response" {...{ density }}>
    <kit.KitGrid arrange="rows" list listRowGap="cards" {...{ density }}>
      {joinable ? action("join", "primary") : action("edit", "primary", input.goto)}
      <kit.KitGrid {...{ density }}>
        {action("invite", "secondary")}{joinable ? action("edit", "secondary", input.goto) : action("cancel", "danger")}
      </kit.KitGrid>
      {input.status === "confirmed" && (joinable ? <kit.KitGrid {...{ density }}>
        {action("complete", "quiet")}{action("cancel", "danger")}
      </kit.KitGrid> : action("complete", "quiet"))}
    </kit.KitGrid>
  </kit.KitContent>;
}

// prettier-ignore
export function Interview(input: Meeting) {
  const state = kit.useComponentState(), loading = state === "loading";
  const { lang, words: { interview: words } } = kit.useWords(hiringWordsFor);
  const surface = "card";
  const density = kit.useKit().density;
  const copy = interviewCopy(input, lang);
  const line = (part: string, value: string | undefined, role: kit.TextRole, tone: kit.TextTone = "text") => {
    const step = role === "title" ? "comfortable" : density;
    const numberScale = role === "number" ? "compact" as const : undefined;
    return value === undefined ? null : loading ?
      <kit.KitSkeleton shape="figure" inset="none" content={[numberScale ? [role, value, "start", numberScale] : [role, value]]} density={step} /> :
      <kit.KitText {...{ part, role, tone }} {...(numberScale ? { numberScale } : {})} density={step} tabular={role === "number"}>{value}</kit.KitText>;
  };
  return <kit.KitCard part="root" padded {...{ density, surface }}>
    {state === "success" || state === "error" ? <kit.KitEmpty part={state} decorativeIcon
      title={state === "success" ? words.success : words.error} icon={state === "success" ? "check" : "info"} /> : <>
      <kit.KitContent {...{ density }}>
        {line("candidate", input.candidate, "title")}{line("role", input.role, "body", "muted")}
        {line("status", copy.status, "label", input.status === "confirmed" ? "good" : "muted")}
      </kit.KitContent>
      <kit.KitContent group="response" {...{ density }}>
        {line("date", copy.date, "body")}{line("time", copy.time, "number")}
        {line("duration", copy.duration, "label", "muted")}{line("past", copy.past, "label", "muted")}
      </kit.KitContent>
      <kit.KitContent group="response" {...{ density }}>
        {line("format", copy.format, "label")}{line("place", input.place, "body")}
        {line("link", copy.link, "label", "muted")}{line("interviewers", copy.interviewers, "body")}
      </kit.KitContent>
      <MeetingActions {...{ input, density, loading }} />
    </>}
  </kit.KitCard>;
}
