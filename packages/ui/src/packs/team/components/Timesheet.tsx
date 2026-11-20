import { z } from "zod";
import * as c from "../../../catalog";

// Core first: Bars/columns charts quantities but cannot show hours by person and day or approve a row.
export const meta = {
  id: "Timesheet",
  status: "draft",
  group: "data",
  purpose: "Review and approve the hours each person worked during a week.",
  pick: "Review each worker's actual hours for seven days and approve their weekly row. Not a chart of daily totals (Bars), a planned rota (Roster), or a generic table (Table).",
  writeHints: [
    "Give seven daily hours, Monday first, using zero for days not worked. Do not write totals or overtime.",
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "people",
  realPath: "Clocked hours are collected in a shared app.",
  variants: { density: ["comfortable", "compact"] },
  parts: ["root", "period"],
  items: { key: "rows", parts: ["root", "name", "hours", "total", "overtime", "approved", "approve"] },
  states: ["filled", "empty"],
  actions: { items: { approve: ["press"] }, when: { approve: { approved: false } } },
  read: (input, _state, lang): string[] => {
    const { rows } = input as z.output<typeof props>;
    const { weekdayShort } = c.wordsFor(lang);
    return rows.map(({ name, hours }) => {
      const days = hours.map((value, day) => `${weekdayShort[day]} ${c.numberLine(value, lang)}`);
      const total = hours.reduce((sum, value) => sum + value, 0);
      return `${name}: ${days.join(", ")} · ${c.totalLine(total, undefined, lang)}`;
    });
  },
} as const satisfies c.Meta;

export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  period: c.text(20),
  rows: z
    .array(
      z.strictObject({
        name: c.text(20),
        hours: z.array(z.number().min(0).max(24)).min(7).max(7),
        approved: z.boolean(),
      }),
    )
    .min(1)
    .max(8),
});

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const names = c.itemsOf(cast, 8).flatMap((item) => c.titleOf(item, 20, thing) ?? []);
  return {
    period: "16–22 Nov 2026",
    rows: (names.length ? names : [c.placeholderTitle(0, lang)]).map((name) => ({
      name,
      hours: [0, 0, 0, 0, 0, 0, 0],
      approved: false,
    })),
  };
}

export const examples = [
  {
    period: "16–22 Nov 2026",
    rows: [
      { name: "Anna", hours: [8, 8, 8, 8, 7.5, 4, 0], approved: false },
      { name: "Rae", hours: [5, 0, 5, 0, 5, 0, 0], approved: true },
    ],
  },
  {
    density: "compact",
    period: "23–29 Nov 2026",
    rows: [{ name: "Sam", hours: [6, 4.5, 0, 6, 4, 3, 0], approved: false }],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Timesheet");
export const probes = [
  choose(
    "Review each worker's actual hours for each of seven days, with weekly totals and an approval button on each person's row.",
  ),
  choose(
    "Draw a simple bar chart of total hours by weekday, with no people, employee records or approval controls.",
    "Bars",
  ),
  write(
    "Review hours for 16–22 Nov 2026: Anna worked 8, 8, 8, 8, 7.5, 4, 0 hours Monday through Sunday, pending approval. Rae worked 5, 0, 5, 0, 5, 0, 0 and is approved.",
  ),
  read("Approve Anna's hours for the week", { address: "t1/r1/approve", action: "press" }),
] satisfies c.Probe[];
