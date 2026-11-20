import { z } from "zod";
import * as c from "../../../catalog";
import { seedApplicationId, seedDate, seedGoto, seedRows, seedTime } from "../seeds";

// Core first: Timeline/hours shows a day's meetings but cannot show one linked interview's lifecycle and actions.
export const meta = {
  id: "Interview",
  status: "draft",
  group: "content",
  purpose: "View and manage one job interview already arranged for an applicant.",
  pick: "One arranged hiring interview with interviewers, time, format, link and confirmation or cancellation. Not a day's agenda (Timeline), available times (Slots), or a service appointment (Appointment).",
  region: "body",
  weight: 2,
  tier: "phone",
  partTiers: { invite: "service", join: "service" },
  realPath:
    "The phone holds the agreed meeting record, while sending invitations and opening call links need outside services.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "plain"] },
  parts: [
    "root",
    "candidate",
    "role",
    "date",
    "time",
    "duration",
    "format",
    "place",
    "interviewers",
    "status",
    "edit",
    "cancel",
    "complete",
    "invite",
    "join",
  ],
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
    derive: ({ status, link }) => ({
      open: status === "proposed" || status === "confirmed",
      joinable: status === "confirmed" && typeof link === "string",
    }),
  },
  writeHints: [
    "Use the agreed local date and 24-hour time, plus minutes; do not write a calculated end time or past flag. Link is optional and must use HTTPS.",
  ],
} as const satisfies c.Meta;

export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  interviewId: c.text(32),
  applicationId: c.text(32),
  candidate: c.text(24),
  role: c.text(32),
  date: c.isoDate,
  time: c.clock,
  minutes: z.int().min(5).max(240),
  format: z.enum(["in_person", "phone", "video"]),
  place: c.text(36).optional(),
  link: z
    .url({ protocol: /^https$/, hostname: /.+/ })
    .max(200)
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

export const examples: z.input<typeof props>[] = [
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
    surface: "plain",
    density: "compact",
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
