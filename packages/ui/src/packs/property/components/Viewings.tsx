import { z } from "zod";
import * as c from "../../../catalog";
import { dateTime, distinct, ref, seedLabels, seedTime } from "../seeds";

// Core first: Timeline/hours cannot tie a prospect to a unit or record attendance and invitations.
export const meta = {
  id: "Viewings",
  status: "draft",
  group: "content",
  purpose: "Arrange property viewings and track each prospect’s confirmation and attendance.",
  pick: "Property viewing appointments with a unit, prospect, confirmation, invitation or attendance outcome. Not a day's timed agenda (Timeline), free slots (Slots), or a booked service (Appointment).",
  writeHints: [
    "Use snake_case viewing and unit refs, a start datetime carrying its timezone, duration in minutes and an edit screen goto. Store the actual status; elapsed time alone is not attendance.",
    'Default to brief rows. For detailed cards with the stored note, use surface "card" and detail "full".',
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Agreed appointments live on the agent’s phone; invitations use messaging, not booking sync.",
  variants: { density: ["comfortable", "compact"], surface: ["plain", "card"], detail: ["brief", "full"] },
  variantParts: { "detail.full": { adds: ["note"] } },
  parts: ["root"],
  items: {
    key: "viewings",
    parts: [
      "root",
      "unit",
      "prospect",
      "start",
      "end",
      "status",
      "note",
      "edit",
      "confirm",
      "cancel",
      "outcome",
      "invite",
    ],
  },
  partTiers: { invite: "service" },
  confirmParts: ["cancel"],
  states: ["filled", "empty", "loading", "success", "error"],
  actions: {
    items: { edit: ["press"], confirm: ["press"], cancel: ["press"], outcome: ["select"], invite: ["send"] },
    noGoto: { items: ["confirm", "cancel"] },
    when: {
      edit: { upcoming: true },
      confirm: { upcoming: true, status: "proposed" },
      invite: { upcoming: true },
      cancel: { active: true },
      outcome: { canRecord: true },
    },
  },
  read: (input, _state, lang): string[] => {
    const { viewings } = input as z.output<typeof props>;
    return viewings.map(({ unit, prospect, start, minutes, status, note }, index) =>
      [`r${index + 1}`, unit, prospect, start, c.durationLine(minutes, lang), status, note]
        .filter(Boolean)
        .join(" · "),
    );
  },
} as const satisfies c.Meta;

const viewing = z.strictObject({
  viewingRef: ref,
  unitRef: ref,
  unit: c.text(32),
  prospect: c.text(24),
  start: dateTime,
  minutes: z.int().min(5).max(180),
  status: z.enum(["proposed", "confirmed", "attended", "no_show", "cancelled"]),
  note: c.text(36).optional(),
  goto: c.screenId,
});

function viewingControls(record: z.output<typeof viewing>, now: number) {
  const upcomingTime = Date.parse(record.start) > now;
  const active = record.status === "proposed" || record.status === "confirmed";
  return {
    active,
    upcoming: active && upcomingTime,
    canRecord: !upcomingTime && record.status !== "cancelled",
  };
}

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    viewings: z.array(viewing).min(1).max(6),
  })
  .refine(({ viewings }) => distinct(viewings, ({ viewingRef }) => viewingRef), { path: ["viewings"] })
  .overwrite((value) => {
    const now = Date.now();
    return {
      ...value,
      viewings: value.viewings.map((record) => ({
        ...record,
        ...viewingControls(record, now),
        note: value.detail === "full" ? record.note : undefined,
      })),
    };
  });

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  return {
    viewings: seedLabels(input).map(({ ref, title, short }) => ({
      viewingRef: `${ref}_view`,
      unitRef: ref,
      unit: title,
      prospect: short,
      start: seedTime,
      minutes: 30,
      status: "proposed",
      goto: "details",
    })),
  };
}

// prettier-ignore
export const examples = [
  { viewings: [
    { viewingRef: "cedar_view", unitRef: "flat_b", unit: "Cedar Flat", prospect: "Noor", start: "2028-11-21T10:30:00+01:00", minutes: 20, status: "confirmed", goto: "edit_viewing" },
  ] },
  { viewings: [
    { viewingRef: "cabin_view", unitRef: "north_cabin", unit: "North Cabin", prospect: "Lee", start: "2026-10-17T14:00:00+01:00", minutes: 30, status: "no_show", note: "Waited at the east gate.", goto: "edit_viewing" },
  ], density: "compact", surface: "card", detail: "full" },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Viewings");
export const probes = [
  choose(
    "Track property showings with which rental unit and prospect, then log whether they attended or didn't show up",
  ),
  choose(
    "Show today's timed agenda along an hour rail, sized by start and end times so I can spot free gaps",
    "Timeline",
  ),
  write(
    "Add proposed showing cedar_view, Cedar Flat (flat_b) for Noor, on 2026-11-21 at 10:30+01:00 for 20 minutes. Edit at edit_viewing.",
  ),
  {
    ...write(
      "Show attended cabin_view for Lee at North Cabin (north_cabin), 2026-10-17 at 14:00+01:00, 30 minutes, edit at edit_viewing. Show all details including the note 'Met at the east gate.'",
    ),
    variant: { axis: "detail", value: "full" },
  },
  read("Send Noor the invitation to view Cedar Flat", { address: "v1/r1/invite", action: "send" }),
] satisfies c.Probe[];
