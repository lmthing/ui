import { z } from "zod";
import * as c from "../../../catalog";
import { distinct, ref, seedDate, seedLabels } from "../seeds";

// Core first: List/rows cannot derive occupancy and agreed rent from dated, mutually exclusive lets.
export const meta = {
  id: "Units",
  status: "draft",
  group: "data",
  purpose: "See who occupies each rental unit and the agreed rent on a chosen date.",
  pick: "Occupancy and agreed rent across independently rented units, derived from dated lets. Not a plain list or tenant directory (List), owned stock (Things), an advertised place (Listing), or one agreement (Lease).",
  writeHints: [
    "Use snake_case references. Every let must reference a unit in this line. Active lets for one unit must not overlap; the end date is exclusive, and cancelled lets do not count.",
    'A stay requires an end date and per "night"; a tenancy uses "week" or "month". Supply askingRent and askingPer together, or omit both. Do not write occupancy or totals.',
    'Default to the plain register with no photos. For photo cards use surface "card" and media "thumb".',
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath:
    "Units and agreed tenancy or stay records live on the device, without a booking engine or lease editor.",
  variants: { density: ["comfortable", "compact"], surface: ["plain", "card"], media: ["none", "thumb"] },
  variantParts: { "media.thumb": { adds: ["photo"] } },
  parts: ["root", "date"],
  items: { key: "units", parts: ["root", "title", "address", "photo", "occupant", "occupancy", "rent"] },
  states: ["filled", "empty", "loading", "error"],
  actions: { parts: { date: ["set"] }, items: { root: ["press"] }, when: { root: { linked: true } } },
  read: (input, _state, lang): string[] => {
    const { on, units, lets } = input as z.output<typeof props>;
    return [
      on,
      ...units.map((unit, index) => {
        const current = lets.find(
          (record) =>
            record.unitRef === unit.unitRef &&
            !record.cancelled &&
            record.start <= on &&
            (!record.end || on < record.end),
        );
        const reserved = lets.some(
          (record) => record.unitRef === unit.unitRef && !record.cancelled && record.start > on,
        );
        const rent = current?.rent ?? unit.askingRent;
        const per = current?.per ?? unit.askingPer;
        return [
          `r${index + 1}`,
          unit.title,
          current ? "occupied" : reserved ? "reserved" : "vacant",
          current?.occupant,
          rent === undefined ? undefined : c.moneyLine(rent, undefined, per, lang),
        ]
          .filter(Boolean)
          .join(" · ");
      }),
    ];
  },
} as const satisfies c.Meta;

const per = z.enum(["night", "week", "month"]);
const unit = z
  .strictObject({
    unitRef: ref,
    title: c.text(32),
    address: c.text(36).optional(),
    photo: c.photo.optional(),
    askingRent: z.number().nonnegative().optional(),
    askingPer: per.optional(),
    goto: c.screenId.optional(),
  })
  .refine(({ askingRent, askingPer }) => (askingRent === undefined) === (askingPer === undefined), {
    path: ["askingPer"],
    message: "Provide asking rent and its period together",
  });
const letRecord = z
  .strictObject({
    letRef: ref,
    unitRef: ref,
    occupant: c.text(24),
    kind: z.enum(["tenancy", "stay"]),
    start: c.isoDate,
    end: c.isoDate.optional(),
    rent: z.number().nonnegative(),
    per,
    cancelled: z.boolean().default(false),
  })
  .refine(
    ({ kind, start, end, per }) =>
      (!end || start < end) && (kind === "stay" ? Boolean(end && per === "night") : per !== "night"),
    { path: ["end"], message: "Use a later end; stays also need nightly rent and a required end" },
  );

type Let = z.output<typeof letRecord>;
function exclusiveLets(lets: readonly Let[]) {
  const active = lets.filter(({ cancelled }) => !cancelled);
  return active.every((a, index) =>
    active
      .slice(index + 1)
      .every(
        (b) =>
          a.unitRef !== b.unitRef ||
          (a.end !== undefined && a.end <= b.start) ||
          (b.end !== undefined && b.end <= a.start),
      ),
  );
}

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    units: z.array(unit).min(1).max(12),
    lets: z.array(letRecord).min(0).max(48),
    on: c.isoDate,
  })
  .refine(({ units }) => distinct(units, (unit) => unit.unitRef), { path: ["units"] })
  .refine(
    ({ units, lets }) =>
      distinct(lets, (record) => record.letRef) &&
      lets.every((record) => units.some((unit) => unit.unitRef === record.unitRef)),
    { path: ["lets"] },
  )
  .refine(({ lets }) => exclusiveLets(lets), { path: ["lets"], message: "Non-cancelled lets cannot overlap" })
  .overwrite((value) => ({
    ...value,
    units: value.units.map((unit) => ({
      ...unit,
      linked: Boolean(unit.goto),
    })),
  }));

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  return {
    units: seedLabels(input, 3).map(({ ref, title, detail }) => ({ unitRef: ref, title, address: detail })),
    lets: [],
    on: seedDate,
  };
}

// prettier-ignore
export const examples = [
  {
    units: [{ unitRef: "flat_a", title: "Willow Flat", address: "14 Mill Lane", goto: "property_unit_detail" },
      { unitRef: "flat_b", title: "Cedar Flat", askingRent: 1050, askingPer: "month" }],
    lets: [{ letRef: "asha_let", unitRef: "flat_a", occupant: "Asha", kind: "tenancy", start: "2026-10-01", rent: 900, per: "month" }],
    on: "2026-11-18",
  },
  {
    units: [{ unitRef: "north_cabin", title: "North Cabin", photo: "lib:home" }],
    lets: [
      { letRef: "lee_stay", unitRef: "north_cabin", occupant: "Lee", kind: "stay", start: "2026-11-19", end: "2026-11-21", rent: 85, per: "night" },
      { letRef: "ivy_stay", unitRef: "north_cabin", occupant: "Ivy", kind: "stay", start: "2026-11-21", end: "2026-11-23", rent: 80, per: "night", cancelled: true },
    ],
    on: "2026-11-18", density: "compact", surface: "card", media: "thumb",
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Units");
export const probes = [
  choose(
    "On any date, see which rental flats are occupied, reserved or vacant from the agreed lets and see each flat's current rent",
  ),
  choose(
    "Show a plain tenant directory of names linked to their profiles, with no occupancy or date calculations",
    "List",
  ),
  write(
    "On 2026-11-18 show Willow Flat (flat_a) occupied under Asha’s monthly tenancy (asha_let) from 2026-10-01 for 900. Add vacant Cedar Flat (flat_b), asking 1050 per month.",
  ),
  {
    ...write(
      "Show North Cabin (north_cabin) on 2026-11-18 with its thumbnail photo lib:home on a card; there are no agreed lets.",
    ),
    variant: { axis: "media", value: "thumb" },
  },
  read("Open Willow Flat’s details", { address: "u1/r1", action: "press" }),
] satisfies c.Probe[];
