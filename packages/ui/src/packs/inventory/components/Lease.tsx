import { z } from "zod";
import * as c from "../../../catalog";

// Core first: KeyValue/default cannot compute time left, next rent date or a renewal warning.
export const meta = {
  id: "Lease",
  status: "draft",
  group: "data",
  purpose: "See one rental agreement, when rent is next due and when to renew.",
  pick: "One existing rental agreement with tenant, term, rent cadence, due day, deposit and calculated time left or renewal warning. Not static facts (KeyValue), terms to sign (Agreement), or a bill (Bills).",
  writeHints: [
    "End must be after start. Supply only the agreed due day (1–31), not next due, progress or renewal status; those are computed.",
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Lease records and terms live on the device.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "plain"] },
  parts: ["root", "tenant", "place", "start", "end", "time_left", "rent", "next_due", "deposit", "renewal"],
  states: ["filled"],
  actions: { parts: { root: ["press"] } },
} as const satisfies c.Meta;

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    tenant: c.text(24),
    place: c.text(32),
    start: c.isoDate,
    end: c.isoDate,
    rent: z.number().nonnegative(),
    per: z.enum(["month", "week"]),
    due: z.int().min(1).max(31),
    deposit: z.number().nonnegative().optional(),
  })
  .refine(({ start, end }) => start < end, { path: ["end"] });

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const row = c.itemsOf(cast, 1)[0];
  return {
    place: (row && c.titleOf(row, 32, thing)) ?? c.placeholderTitle(0, lang),
    tenant: (row && c.detailOf(row, 24, thing)) ?? c.placeholderTitle(1, lang),
    start: "2026-01-01",
    end: "2026-01-02",
    rent: 0,
    per: "month",
    due: 1,
  };
}

export const examples = [
  {
    tenant: "Ana",
    place: "Patio flat",
    start: "2026-01-01",
    end: "2026-12-30",
    rent: 950,
    per: "month",
    due: 12,
    deposit: 950,
  },
  {
    tenant: "Sam",
    place: "Trail cottage",
    start: "2026-10-12",
    end: "2027-01-11",
    rent: 180,
    per: "week",
    due: 1,
    density: "compact",
    surface: "plain",
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Lease");
export const probes = [
  choose(
    "Show one existing tenant's rental agreement, term dates, time left, deposit held and when the next month's rent is due",
  ),
  choose(
    "Show static pairs labelled Meter serial and Floor for this record. No timeline, agreement, rent or calculations.",
    "KeyValue",
  ),
  write(
    "Ana rents Patio flat from 2026-01-01 until 2026-12-30, at 950 per month due on day 12, with a 950 deposit.",
  ),
  read("Open Ana's rental agreement terms for Patio flat", { address: "l1", action: "press" }),
] satisfies c.Probe[];
