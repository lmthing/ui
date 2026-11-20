import { z } from "zod";
import * as c from "../../../catalog";
import { dateTime, distinct, ref, seedDate, seedLabels } from "../seeds";

const conditions = ["unrecorded", "good", "worn", "damaged", "not_applicable"] as const;

// Core first: Checklist/default cannot bind condition, notes and photographic evidence to a locked unit report.
export const meta = {
  id: "Inspections",
  status: "draft",
  group: "input",
  purpose: "Record and sign off dated room conditions and evidence for a unit.",
  pick: "Dated room-by-room condition report with feature notes, photos, prior-report comparison and sign-off. Not jobs to tick (Checklist), photos alone (Gallery), or a repair to request (RequestQueue).",
  writeHints: [
    "Use snake_case inspection, unit, room and check refs. Provide condition for each check; use unrecorded when unknown. Photos are media refs, never URLs.",
    'Use style "rooms" to record evidence and "report" for a read-only summary. Set finalisedAt only for a signed-off record with no unrecorded checks; previousRef is a different report.',
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath:
    "Reports and inspector sign-off live locally; adding evidence uses camera or library permission, not tenant consent.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"] },
  parts: ["root", "unit", "date", "kind", "completion", "finalise"],
  items: { key: "entries", parts: ["root", "title", "condition", "note", "photo", "remove_photo"] },
  partTiers: { photo: "ok" },
  confirmParts: ["remove_photo", "finalise"],
  states: ["filled", "empty", "loading", "success", "error"],
  actions: {
    parts: { finalise: ["press"] },
    items: {
      root: ["select"],
      condition: ["select"],
      note: ["type"],
      photo: ["press"],
      remove_photo: ["press"],
    },
    when: {
      root: { entryKind: "room", style: "rooms" },
      finalise: { canFinalise: true },
      condition: { editable: true },
      note: { editable: true },
      photo: { editable: true },
      remove_photo: { editable: true, hasPhoto: true },
    },
  },
  select: { prop: "roomRef", value: { field: "roomRef" } },
  read: (input): string[] => {
    const { unit, date, kind, rooms, finalisedAt } = input as z.output<typeof props>;
    return [
      [unit, date, kind, finalisedAt].filter(Boolean).join(" · "),
      ...rooms.map(
        ({ title, checks }) =>
          `${title}: ${checks
            .map(({ title, condition, note, photos }) =>
              [title, condition, note, ...photos].filter(Boolean).join(" · "),
            )
            .join("; ")}`,
      ),
    ];
  },
} as const satisfies c.Meta;

const check = z.strictObject({
  checkRef: ref,
  title: c.text(32),
  condition: z.enum(conditions),
  note: c.text(100).optional(),
  photos: z.array(c.photo).min(0).max(3),
});
const room = z
  .strictObject({
    roomRef: ref,
    title: c.text(32),
    checks: z.array(check).min(1).max(6),
  })
  .refine(({ checks }) => distinct(checks, ({ checkRef }) => checkRef), { path: ["checks"] });

const schema = z.strictObject({
  ...c.variantProps(meta.variants),
  inspectionRef: ref,
  unitRef: ref,
  unit: c.text(32),
  date: c.isoDate,
  kind: z.enum(["move_in", "move_out", "periodic"]),
  rooms: z.array(room).min(1).max(8),
  previousRef: ref.optional(),
  finalisedAt: dateTime.optional(),
  style: z.enum(["rooms", "report"]).default("rooms"),
});

type Report = z.output<typeof schema>;
const complete = ({ rooms }: Report) =>
  rooms.every(({ checks }) => checks.every(({ condition }) => condition !== "unrecorded"));

function reportEntries(value: Report) {
  const editable = value.style === "rooms" && !value.finalisedAt;
  return value.rooms.flatMap(({ roomRef, title, checks }) => [
    { roomRef, title, entryKind: "room", editable: false },
    ...checks.map((check) => ({
      ...check,
      roomRef,
      entryKind: "check",
      editable,
      note: check.note ?? "",
      hasPhoto: check.photos.length > 0,
    })),
  ]);
}

export const props = schema
  .refine(({ rooms }) => distinct(rooms, ({ roomRef }) => roomRef), { path: ["rooms"] })
  .refine(({ inspectionRef, previousRef }) => inspectionRef !== previousRef, { path: ["previousRef"] })
  .refine((value) => !value.finalisedAt || complete(value), {
    path: ["finalisedAt"],
    message: "Every check needs a condition before sign-off",
  })
  .overwrite((value) => ({
    ...value,
    entries: reportEntries(value),
    canFinalise: value.style === "rooms" && !value.finalisedAt && complete(value),
  }));

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  const { ref, title } = seedLabels(input)[0]!;
  return {
    inspectionRef: `${ref}_report`,
    unitRef: ref,
    unit: title,
    date: seedDate,
    kind: "periodic",
    rooms: [
      {
        roomRef: `${ref}_room`,
        title: c.placeholderTitle(1, input.lang),
        checks: [
          {
            checkRef: `${ref}_check`,
            title: c.placeholderTitle(2, input.lang),
            condition: "unrecorded",
            photos: [],
          },
        ],
      },
    ],
  };
}

// prettier-ignore
export const examples = [
  { inspectionRef: "willow_move_in", unitRef: "flat_a", unit: "Willow Flat", date: "2026-11-18", kind: "move_in",
    rooms: [{ roomRef: "kitchen", title: "Kitchen", checks: [
      { checkRef: "worktop", title: "Worktop", condition: "worn", note: "Scuffs by the sink.", photos: ["local:1"] },
    ] }] },
  { inspectionRef: "cabin_move_out", unitRef: "north_cabin", unit: "North Cabin", date: "2026-11-17", kind: "move_out",
    previousRef: "cabin_move_in", finalisedAt: "2026-11-17T11:15:00+00:00", style: "report", density: "compact", surface: "outlined",
    rooms: [{ roomRef: "hall", title: "Hall", checks: [{ checkRef: "skirting", title: "Skirting", condition: "good", photos: [] }] }] },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Inspections");
export const probes = [
  choose(
    "At move-in record the condition of each feature by room, attach photos and notes, then lock the dated report",
  ),
  choose(
    "Give me independent household chores with a checkbox per job; no room evidence or formal report",
    "Checklist",
  ),
  write(
    "Draft a move-in report willow_move_in for Willow Flat (flat_a), dated 2026-11-18. Kitchen (kitchen), Worktop (worktop) worn, note 'Scuffs by the sink.', photo local:1. Not signed off yet.",
  ),
  read("Finalise and lock this completed move-in condition report", {
    address: "i1/finalise",
    action: "press",
  }),
] satisfies c.Probe[];
