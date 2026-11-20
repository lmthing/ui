import { z } from "zod";
import * as c from "../../../catalog";

// Core first: List/cards cannot record lending direction, due dates, returns and reminders.
export const meta = {
  id: "Loans",
  status: "draft",
  group: "data",
  purpose: "See who has borrowed your things and when to return theirs.",
  pick: "Physical things lent to or borrowed from people, with due-back dates, returns or reminders. Not a plain directory (List), debts (Split), or booked time (Appointment).",
  writeHints: [
    "Use lent for my item with someone else and borrowed for someone else's item with me. YYYY-MM-DD dates only; never write overdue.",
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Loan records live on the device; reminders need a messaging service.",
  variants: { density: ["comfortable", "compact"] },
  parts: ["root"],
  items: {
    key: "loans",
    parts: ["root", "thing", "photo", "person", "way", "since", "due", "overdue", "returned", "remind"],
  },
  partTiers: { remind: "service" },
  confirmParts: ["returned"],
  states: ["filled", "empty"],
  actions: { items: { returned: ["press"], remind: ["press"] } },
} as const satisfies c.Meta;

const loan = z
  .strictObject({
    thing: c.text(28),
    photo: c.photo.optional(),
    person: c.text(20),
    way: z.enum(["lent", "borrowed"]),
    since: c.isoDate,
    due: c.isoDate.optional(),
  })
  .refine(({ since, due }) => !due || since <= due, { path: ["due"] });
export const props = z.strictObject({ ...c.variantProps(meta.variants), loans: z.array(loan).min(1).max(6) });

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const type = c.thingOf(cast);
  const row = c.itemsOf(cast, 1)[0];
  return {
    loans: [
      {
        thing: (row && c.titleOf(row, 28, type)) ?? c.placeholderTitle(0, lang),
        person: (row && c.detailOf(row, 20, type)) ?? c.placeholderTitle(1, lang),
        way: "lent",
        since: "2026-01-01",
      },
    ],
  };
}

export const examples = [
  {
    loans: [
      {
        thing: "Pruning shears",
        photo: "lib:plants",
        person: "Ana",
        way: "lent",
        since: "2026-10-02",
        due: "2026-10-16",
      },
    ],
  },
  {
    density: "compact",
    loans: [{ thing: "Long training lead", person: "Sam", way: "borrowed", since: "2026-11-10" }],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Loans");
export const probes = [
  choose(
    "Keep track of tools I lent to neighbours and things I borrowed, when they are due back, and mark each returned",
  ),
  choose(
    "Show several tappable names leading to their own pages, without lending or borrowing records",
    "List",
  ),
  write(
    "I lent Ana my pruning shears on 2026-10-02 and they were due back 2026-10-16. The photo is lib:plants.",
  ),
  read("Mark the pruning shears as returned", { address: "l1/r1/returned", action: "press" }),
] satisfies c.Probe[];
