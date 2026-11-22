import { z } from "zod";
import * as c from "../../../catalog";
import { boxScoreTotals } from "../copy";
import { sportsWordsFor } from "../lang";

// Core first: Stats/default gives independent figures, not a period line score and switchable player tables.
const sides = ["home", "away"] as const;
export const meta = {
  id: "BoxScore",
  status: "draft",
  group: "data",
  purpose: "Compare period scores and inspect the players' match statistics for either team.",
  pick: "Per-player match statistics together with a period-by-period team line score. Not independent headline numbers (Stats), league standings (Standings), one player's profile (Profile), or a live scorekeeper (Scoreboard).",
  writeHints: [
    "Each player's stats follow the shared columns in order, with exactly one short text value per column. Never write team totals; the periods supply them.",
    'Use style "linescore" for the period scores alone. In the full view use detail "brief" only to hide player positions while still drawing the player table.',
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath:
    "Player stat sheets are entered on the scorekeeper's phone or fetched from a league stats service.",
  variants: {
    density: ["comfortable", "compact"],
    surface: ["card", "outlined"],
    detail: ["full", "brief"],
  },
  variantParts: { "detail.brief": { hides: ["position"] } },
  parts: ["root", "title", "line_score", "team", "players", "empty"],
  items: { key: "players", parts: ["root", "name", "position"], visibleWhen: { visible: true } },
  states: ["filled", "empty", "loading"],
  select: { prop: "team", choices: { team: { prop: "teamChoices" } } },
  actions: {
    parts: { team: ["select"] },
    items: { root: ["press"] },
    when: { team: { style: "full" }, root: { linked: true } },
  },
} as const satisfies c.Meta;

const periodScore = z.number().min(0).max(999);
const player = z.strictObject({
  name: c.text(20),
  pos: c.text(4).optional(),
  stats: z.array(c.text(8)).min(3).max(8),
  goto: c.screenId.optional(),
});
const players = z.array(player).min(1).max(16);
const schema = z
  .strictObject({
    ...c.variantProps(meta.variants),
    home: c.text(20),
    away: c.text(20),
    periods: z
      .array(z.strictObject({ label: c.text(6), home: periodScore, away: periodScore }))
      .min(1)
      .max(9),
    columns: z.array(c.text(8)).min(3).max(8),
    homePlayers: players,
    awayPlayers: players,
    team: z.enum(sides).default("home"),
    style: z.enum(["full", "linescore"]).default("full"),
  })
  .refine(
    ({ columns, homePlayers, awayPlayers }) =>
      [...homePlayers, ...awayPlayers].every(({ stats }) => stats.length === columns.length),
    { path: ["columns"], message: "Provide one stat per column for each player" },
  );

function withPlayers(input: z.output<typeof schema>) {
  const rows = (side: (typeof sides)[number]) =>
    (side === "home" ? input.homePlayers : input.awayPlayers).map((row) => ({
      ...row,
      linked: !!row.goto,
      visible: input.style === "full" && input.team === side,
    }));
  return {
    ...input,
    totals: boxScoreTotals(input.periods),
    teamChoices: sides.map((value) => ({ value, label: input[value] })),
    players: sides.flatMap(rows),
  };
}

export const props = schema.overwrite(withPlayers) as typeof schema &
  z.ZodType<ReturnType<typeof withPlayers>, z.input<typeof schema>>;

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const items = c.itemsOf(cast, 4);
  const thing = c.thingOf(cast);
  const name = (index: number) =>
    (items[index] && c.titleOf(items[index], 20, thing)) || c.clip(c.placeholderTitle(index, lang), 20);
  const copy = sportsWordsFor(lang).boxScore;
  const row = (index: number) => ({ name: name(index), stats: [0, 0, 0].map((n) => c.numberLine(n, lang)) });
  return {
    home: name(0),
    away: name(1),
    periods: [{ label: copy.period, home: 0, away: 0 }],
    columns: [...copy.columns],
    homePlayers: [row(2)],
    awayPlayers: [row(3)],
  };
}

export const examples = [
  {
    home: "Ledge Lions",
    away: "Fern House",
    periods: [
      { label: "Q1", home: 20, away: 18 },
      { label: "Q2", home: 17, away: 24 },
      { label: "Q3", home: 26, away: 19 },
      { label: "Q4", home: 18, away: 16 },
    ],
    columns: ["MIN", "PTS", "REB", "AST", "STL"],
    homePlayers: [
      { name: "Amara Field", pos: "PG", stats: ["34", "23", "4", "8", "2"], goto: "amara_field" },
      { name: "Noah Reed", pos: "C", stats: ["29", "16", "11", "2", "1"] },
      { name: "Ella Woods", pos: "SG", stats: ["27", "14", "3", "4", "1"] },
    ],
    awayPlayers: [{ name: "Sam Banks", pos: "SF", stats: ["36", "26", "8", "5", "3"], goto: "sam_banks" }],
  },
  {
    home: "Trot Town",
    away: "Canal Club",
    team: "away",
    style: "linescore",
    periods: [
      { label: "Set 1", home: 20, away: 25 },
      { label: "Set 2", home: 27, away: 25 },
    ],
    columns: ["K", "A", "D"],
    homePlayers: [{ name: "Maya Lane", stats: ["12", "1", "9"] }],
    awayPlayers: [{ name: "Alex Park", stats: ["10", "4", "11"] }],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("BoxScore");
export const probes = [
  choose(
    "Give me both teams' points in each basketball quarter and a switch between their players' minutes, points, rebounds and assists.",
  ),
  choose(
    "Put three independent headline figures side by side: total walks, active clients and new enquiries. No time breakdown or individual rows.",
    "Stats",
  ),
  write(
    "Show a basketball line score: Lions vs Fern, first quarter 18–20, second 22–19. Below it let me switch the two teams' player tables. Use PTS, REB, AST: Lions' Amara Field 12, 4, 3; Fern's Sam Banks 10, 5, 1.",
  ),
  {
    ...write(
      "Show Lions vs Fern, first quarter 18–20 and second 22–19. Keep the switchable tables with PTS, REB, AST: Lions' guard Amara Field 12, 4, 3; Fern's forward Sam Banks 10, 5, 1. Keep the positions in the data but hide the positions in the display.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Switch the player table to Fern House.", { address: "c1/team", action: "select", value: "away" }),
  read("Open Amara Field's player profile.", { address: "c1/r1", action: "press" }),
] satisfies c.Probe[];

export function BoxScore(_input: c.Props<typeof props, typeof meta>) {
  return null;
}
