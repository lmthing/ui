import { z } from "zod";
import * as c from "../../../catalog";
import { seedDate, seedTitles } from "../seeds";

// Core first: Calendar/week cannot compare each participant's availability across candidate dates.
const offered = ["yes", "maybe", "no"] as const;
const answers = [...offered, "none"] as const;
const maxDates = 6;
const choiceProp = (column: number) => `answer_${column + 1}`;
export const meta = {
  id: "FindDate",
  status: "draft",
  group: "input",
  purpose: "Compare people's availability and find the best date for a gathering.",
  pick: "A date-finding matrix: dates as columns and people as rows with yes, maybe or no per date, and the best date computed. Not a calendar to pick a day (Calendar) or a general poll (Poll).",
  writeHints: [
    "Give each person exactly one answer per date in the same order. Use none for an unanswered date; do not write a winner.",
    "If the brief names the viewer, place that person first so the preview offers their row's controls.",
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "people",
  realPath: "Availability is collected through a shared app or link.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"] },
  parts: ["root", "dates", "best"],
  items: { key: "cells", parts: ["root"] },
  states: ["filled", "empty"],
  actions: { items: { root: ["select"] }, when: { root: { editable: true } } },
  selections: Object.fromEntries(
    Array.from({ length: maxDates }, (_, column) => [
      `r${column + 1}`,
      { prop: choiceProp(column), choices: offered, runtime: true as const },
    ]),
  ),
  live: { derive: projectAnswers },
  read: (input, state, lang): string[] =>
    state === "filled" ? matrixReading(input as z.output<typeof props>, lang) : [],
} as const satisfies c.Meta;

const candidate = z.strictObject({ date: c.isoDate, time: c.clock.optional() });
const person = z.strictObject({ name: c.text(16), answers: z.array(z.enum(answers)).min(2).max(maxDates) });
const schema = z
  .strictObject({
    ...c.variantProps(meta.variants),
    dates: z.array(candidate).min(2).max(maxDates),
    people: z.array(person).min(1).max(12),
  })
  .refine(({ dates, people }) => people.every(({ answers }) => answers.length === dates.length), {
    path: ["people"],
    message: "Each person needs one answer per date",
  })
  .refine(
    ({ dates }) => new Set(dates.map(({ date, time }) => `${date}/${time ?? ""}`)).size === dates.length,
    {
      path: ["dates"],
      message: "Use distinct candidate slots",
    },
  );

function withCells(input: z.output<typeof schema>) {
  return {
    ...input,
    ...Object.fromEntries(
      input.people[0]!.answers.map((answer, column) => [
        choiceProp(column),
        answer === "none" ? undefined : answer,
      ]),
    ),
    cells: input.people.flatMap(({ name, answers }, row) =>
      answers.map((answer, column) => ({ name, answer, column, row, editable: row === 0 })),
    ),
  };
}
export const props = schema.overwrite(withCells) as typeof schema &
  z.ZodType<ReturnType<typeof withCells>, z.input<typeof schema>>;

function projectAnswers(input: Readonly<c.Values>): c.Values {
  const { people, cells } = input as z.output<typeof props>;
  const current = people[0]!;
  const answers = current.answers.map((answer, column) => {
    const picked = input[choiceProp(column)];
    return offered.find((choice) => choice === picked) ?? answer;
  });
  return {
    people: [{ ...current, answers }, ...people.slice(1)],
    cells: cells.map((cell) => (cell.editable ? { ...cell, answer: answers[cell.column]! } : cell)),
  };
}

function matrixReading({ dates, people }: z.output<typeof props>, lang?: string): string[] {
  const slots = dates.map(({ date, time }) => (time ? `${date} ${time}` : date));
  const ranked = dates
    .map((_, column) => ({
      column,
      yes: people.filter(({ answers }) => answers[column] === "yes").length,
      maybe: people.filter(({ answers }) => answers[column] === "maybe").length,
    }))
    .sort((a, b) => b.yes - a.yes || b.maybe - a.maybe || a.column - b.column);
  const best = ranked[0]!;
  return [
    slots.join(" · "),
    ...(best.yes || best.maybe ? [`${slots[best.column]}: ${c.numberLine(best.yes, lang)} yes`] : []),
    ...people.map(({ name, answers }) => `${name}: ${answers.join(" · ")}`),
    ...slots.map((slot, index) => `r${index + 1}: ${people[0]!.name} ${slot}`),
  ];
}

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  return {
    dates: [{ date: seedDate }, { date: "2026-11-21" }],
    people: seedTitles(input, 16, 3).map((name) => ({ name, answers: ["none", "none"] })),
  };
}

export const examples = [
  {
    dates: [
      { date: "2027-04-09", time: "18:30" },
      { date: "2027-04-10", time: "19:00" },
    ],
    people: [
      { name: "Imani Cole", answers: ["yes", "none"] },
      { name: "Hugo Wells", answers: ["maybe", "no"] },
    ],
  },
  {
    dates: [{ date: "2027-06-11" }, { date: "2027-06-12" }, { date: "2027-06-13" }],
    people: [{ name: "Ruth Shah", answers: ["no", "yes", "maybe"] }],
    density: "compact",
    surface: "outlined",
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("FindDate");
export const probes = [
  choose(
    "Find when our reunion works for most people: a grid of candidate dates against each person's yes, maybe or no, with the best date highlighted.",
  ),
  choose(
    "Show a week of dates with activity dots so I can tap a day; don't ask anyone whether they can attend.",
    "Calendar",
  ),
  write(
    "Compare availability on 2027-04-09 at 18:30 and 2027-04-10 at 19:00. I'm Imani Cole: yes then no reply. Hugo Wells: maybe then no.",
  ),
  read("I'm Imani. Record my answer for April 10.", { address: "f1/r2", action: "select" }),
] satisfies c.Probe[];
