import { z } from "zod";
import * as c from "../../../catalog";

// Core first: List/lead:number ranks one value, not a table of played, wins, draws, losses and form.
export const meta = {
  id: "Standings",
  status: "draft",
  group: "data",
  purpose: "Compare teams in a league and see our place in the season.",
  pick: "A league table with played, wins, draws, losses, goal difference, points and recent form. Not a ranking on one value (List) or a general records table (Table).",
  writeHints: [
    "Write wins, draws, losses and goals for and against; never write played, points, goal difference or rank. Mine is a zero-based index in the input rows; lines are one-based cut positions in the ordered table.",
    'To hide recent form, write detail "brief" and still supply the form data. Write density: null unless the person asks to change spacing. Omit scoring unless the league awards nonstandard points per win or draw.',
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  partTiers: { root: "people" },
  realPath: "The organiser enters results on one phone; sharing the league across clubs needs a shared app.",
  variants: { density: ["comfortable", "compact"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["form"] } },
  parts: ["root"],
  items: {
    key: "rows",
    parts: ["root", "position", "team", "played", "won", "drawn", "lost", "difference", "points", "form"],
  },
  states: ["filled", "loading"],
  actions: { items: { root: ["press"] } },
  read: (input, _state, lang): string[] => {
    return rankedRows(input as c.Props<typeof props, typeof meta>).map(
      ({ id, team, played, won, drawn, lost, difference, points }, rank) =>
        `${id}: ${team} · ${[rank + 1, played, won, drawn, lost, difference, points].map((value) => c.numberLine(value, lang)).join(" · ")}`,
    );
  },
} as const satisfies c.Meta;

const count = z.int().nonnegative();
const record = z.strictObject({
  team: c.text(20),
  won: count,
  drawn: count,
  lost: count,
  for: count,
  against: count,
  form: z
    .array(z.enum(["w", "d", "l"]))
    .min(0)
    .max(5),
});
export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    rows: z.array(record).min(2).max(20),
    mine: z.int().min(0).max(19).optional(),
    lines: z.array(z.int().min(1).max(19)).min(0).max(2).default([]),
    scoring: z
      .strictObject({ win: z.int().min(0).max(99), draw: z.int().min(0).max(99) })
      .default({ win: 3, draw: 1 }),
  })
  .refine(({ rows, mine }) => mine === undefined || mine < rows.length, { path: ["mine"] })
  .refine(
    ({ rows, lines }) => new Set(lines).size === lines.length && lines.every((line) => line < rows.length),
    { path: ["lines"] },
  )
  .overwrite((input) =>
    input.detail === "brief" ? { ...input, rows: input.rows.map((row) => ({ ...row, form: [] })) } : input,
  );

function rankedRows({ rows, scoring }: c.Props<typeof props, typeof meta>) {
  return rows
    .map((row) => ({
      ...row,
      played: row.won + row.drawn + row.lost,
      difference: row.for - row.against,
      points: row.won * scoring.win + row.drawn * scoring.draw,
    }))
    .sort((a, b) => b.points - a.points || b.difference - a.difference || b.for - a.for);
}

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const names = c
    .itemsOf(cast, 3)
    .map((item, index) => c.titleOf(item, 20, thing) || c.placeholderTitle(index, lang));
  while (names.length < 2) names.push(c.placeholderTitle(names.length, lang));
  return { rows: names.map((team) => ({ team, won: 0, drawn: 0, lost: 0, for: 0, against: 0, form: [] })) };
}

export const examples = [
  {
    mine: 1,
    lines: [1, 2],
    rows: [
      { team: "Fern House", won: 3, drawn: 1, lost: 0, for: 9, against: 2, form: ["w", "w", "d", "w"] },
      { team: "Ledge Rovers", won: 2, drawn: 1, lost: 1, for: 7, against: 4, form: ["d", "w", "l", "w"] },
      { team: "Garden Crew", won: 1, drawn: 1, lost: 2, for: 4, against: 6, form: ["l", "l", "w", "d"] },
    ],
  },
  {
    detail: "brief",
    density: "compact",
    rows: [
      { team: "Trot Town", won: 3, drawn: 2, lost: 0, for: 9, against: 5, form: ["w", "w", "d", "d", "w"] },
      {
        team: "River Rovers",
        won: 1,
        drawn: 2,
        lost: 2,
        for: 6,
        against: 8,
        form: ["l", "d", "w", "l", "d"],
      },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Standings");
export const probes = [
  choose(
    "Compare all the sides in our league by played, wins, draws, losses, goal difference, points and last five results.",
  ),
  choose(
    "Give me a ranked list of the top scorers: a name and one goal total each, no other columns or match records.",
    "List",
  ),
  write(
    "Make a league table for Fern House (3 wins, 1 draw, 0 losses, 9 goals for, 2 against, last results win/win/draw/win) and Ledge Rovers (2 wins, 1 draw, 1 loss, 7 for, 4 against, last results draw/win/loss/win). Highlight Ledge and put a promotion line after first.",
  ),
  {
    ...write(
      "Show Trot Town with 3 wins, 2 draws, no losses, 9 for and 5 against and River Rovers with 1 win, 2 draws, 2 losses, 6 for and 8 against. Keep the recent form data (Trot last won and River last drew) but hide the form strip; show the rest of the league table.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Open the league table row for Ledge Rovers", { address: "s1/r2", action: "press" }),
] satisfies c.Probe[];
