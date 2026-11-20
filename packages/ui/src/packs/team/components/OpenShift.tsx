import { z } from "zod";
import * as c from "../../../catalog";

// Core first: Checklist/check marks a job done, not a claim to cover an unassigned shift.
export const meta = {
  id: "OpenShift",
  status: "draft",
  group: "action",
  purpose: "Pick up an unassigned shift and see when it runs and what it pays.",
  pick: "Claim one of several unassigned work shifts with a date, time range, role and optional pay. Not an assigned shift (Shift) or a list of jobs to tick off (Checklist).",
  region: "body",
  weight: 2,
  tier: "people",
  realPath: "A manager approves claims for open shifts in a shared rota.",
  variants: { density: ["comfortable", "compact"] },
  parts: ["root"],
  items: { key: "shifts", parts: ["root", "date", "from", "to", "role", "pay", "claim"] },
  states: ["filled", "empty", "success"],
  actions: { items: { claim: ["press"] } },
  read: (input, _state, lang): string[] => {
    const { shifts } = input as z.output<typeof props>;
    return shifts.map(({ date, from, to, pay }, index) => {
      const time = `${c.timeOfDayLine(from, lang)}–${c.timeOfDayLine(to, lang)}`;
      return `r${index + 1} ${c.appointmentDate(date, lang)} ${time}${pay === undefined ? "" : ` · ${c.moneyLine(pay, undefined, undefined, lang)}`}`;
    });
  },
} as const satisfies c.Meta;

export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  shifts: z
    .array(
      z.strictObject({
        date: c.isoDate,
        from: c.clock,
        to: c.clock,
        role: c.text(16),
        pay: z.number().min(0).optional(),
      }),
    )
    .min(1)
    .max(6),
});

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const roles = c.itemsOf(cast, 6).flatMap((item) => c.titleOf(item, 16, thing) ?? []);
  return {
    shifts: (roles.length ? roles : [c.placeholderTitle(0, lang)]).map((role) => ({
      date: "2026-11-21",
      from: "09:00",
      to: "12:00",
      role,
    })),
  };
}

export const examples = [
  {
    shifts: [
      { date: "2026-11-21", from: "07:00", to: "11:00", role: "Plant care", pay: 64 },
      { date: "2026-11-22", from: "13:00", to: "17:00", role: "Potting bench" },
    ],
  },
  {
    density: "compact",
    shifts: [{ date: "2026-11-21", from: "08:00", to: "13:00", role: "Park walks", pay: 80 }],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("OpenShift");
export const probes = [
  choose("Show the unassigned work shifts, their hours and pay, with a button to claim each shift."),
  choose(
    "Give me a list of separate jobs to tick as done, such as watering and washing the trays.",
    "Checklist",
  ),
  write(
    "Offer two unassigned shifts staff can claim: Potting bench on 2026-11-21 from 07:00 to 11:00 for 64, and Plant care on 2026-11-22 from 13:00 to 17:00.",
  ),
  read("Claim the Potting bench shift", { address: "o1/r2/claim", action: "press" }),
] satisfies c.Probe[];
