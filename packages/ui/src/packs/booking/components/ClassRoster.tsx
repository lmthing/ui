import { z } from "zod";
import * as c from "../../../catalog";

// Core first: Progress/compact shows capacity, not who arrived, missed class, or can be admitted.
export const meta = {
  id: "ClassRoster",
  status: "draft",
  group: "action",
  purpose: "Check attendees in to a group class and fill newly open places.",
  pick: "Take attendance for named attendees at a scheduled group class, admit walk-ins or promote waitlisted guests. Not capacity bars alone (Progress), read-only avatars (People), or staff shifts (Roster).",
  region: "body",
  weight: 3,
  dense: true,
  tier: "people",
  realPath: "A shared class roster synced across instructor and front-desk devices.",
  parts: ["root", "title", "at", "attendance", "spaces", "waiting", "feedback", "walkin", "promote"],
  items: { key: "attendees", parts: ["root", "name", "photo", "status", "paid", "checkin", "noshow"] },
  states: ["filled", "empty", "loading", "success", "error"],
  confirmParts: ["noshow"],
  variants: {
    density: ["comfortable", "compact"],
    surface: ["card", "outlined"],
    detail: ["full", "brief"],
  },
  variantParts: { "detail.brief": { hides: ["at", "paid"] } },
  actions: {
    parts: { walkin: ["press"], promote: ["press"] },
    items: { checkin: ["toggle"], noshow: ["press"] },
    when: {
      walkin: { canAdmit: true },
      promote: { canPromote: true },
      checkin: { canCheck: true },
      noshow: { status: "booked" },
    },
  },
} as const satisfies c.Meta;
const attendee = z.strictObject({
  id: c.text(24),
  name: c.text(24),
  photo: c.photo.optional(),
  status: z.enum(["booked", "checked_in", "no_show"]),
  paid: z.boolean().optional(),
});
export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  sessionId: c.text(24),
  title: c.text(32),
  at: z.iso.datetime({ offset: true }),
  capacity: z.int().min(2).max(60),
  attendees: z.array(attendee).min(0).max(30),
  waitlistCount: z.int().min(0).max(30).optional(),
});

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const attendees = c.itemsOf(cast, 3).flatMap((item, index) => {
    const name = c.titleOf(item, 24, thing);
    return name ? [{ id: String(index + 1), name, status: "booked" as const }] : [];
  });
  return {
    sessionId: c.placeholderValue,
    title: c.placeholderTitle(0, lang),
    at: new Date(0).toISOString(),
    capacity: Math.max(2, attendees.length),
    attendees,
  };
}

const ledge = {
  sessionId: "repotting_101",
  title: "Repotting workshop",
  at: "2026-11-21T10:00:00-05:00",
  capacity: 6,
  attendees: [
    { id: "mia", name: "Mia Chen", photo: "lib:mia", status: "checked_in", paid: true },
    { id: "jules", name: "Jules Rivera", status: "booked", paid: false },
    { id: "dev", name: "Dev Singh", status: "no_show" },
  ],
  waitlistCount: 2,
} satisfies z.input<typeof props>;
export const examples = [
  ledge,
  {
    sessionId: "leash_skills",
    title: "Loose-leash class",
    at: "2026-11-22T09:30:00-05:00",
    capacity: 2,
    attendees: [
      { id: "sam", name: "Sam Morgan", status: "checked_in" },
      { id: "robin", name: "Robin Bell", status: "booked" },
    ],
    waitlistCount: 1,
    density: "compact",
  },
] satisfies z.input<typeof props>[];
const { choose, write, read } = c.probesFor("ClassRoster");
export const probes = [
  choose(
    "Take attendance for my repotting workshop: check people in by name, mark no-shows, and admit the next waitlisted guest if a place opens.",
  ),
  choose(
    "Show two compact capacity bars: eight of twelve class places booked and six of twelve checked in. I only need totals, no names or controls.",
    "Progress",
  ),
  write(
    "For the repotting workshop on November 21, 2026 at 10 am Eastern (-05:00), show check-in for a class of six. Mia Chen has arrived and Jules Rivera is booked. Two are waitlisted.",
  ),
  read("Check Jules Rivera in", { address: "c1/r2/checkin", action: "toggle" }),
] satisfies c.Probe[];
