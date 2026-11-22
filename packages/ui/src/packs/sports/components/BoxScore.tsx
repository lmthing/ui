import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { boxScoreReading, boxScoreTotals } from "../copy";
import { sportsWordsFor } from "../lang";

// Core first: Stats/default gives independent figures, not a period line score and switchable player tables.
const sides = ["home", "away"] as const;
export const meta = {
  id: "BoxScore",
  status: "ready",
  group: "data",
  purpose: "Compare period scores and inspect the players' match statistics for either team.",
  pick: "Per-player match statistics together with a period-by-period team line score. Not independent headline numbers (Stats), league standings (Standings), one player's profile (Profile), or a live scorekeeper (Scoreboard).",
  writeHints: [
    "Each player's stats follow the shared columns in order, with exactly one short text value per column. Never write team totals; the periods supply them.",
    'Use style "linescore" for the period scores alone. In the full view use detail "brief" only to hide player positions while still drawing the player table.',
    "Leave density and surface null unless explicitly requested, including when detail is brief.",
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
  parts: ["root", "title", "total", "line_score", "team", "players", "empty"],
  items: {
    key: "players",
    parts: ["root", "name", "position"],
    addressedWhen: { hasPlayers: true },
    visibleWhen: { visible: true },
  },
  states: ["filled", "empty", "loading"],
  select: { prop: "team", choices: { team: { prop: "teamChoices" } } },
  actions: {
    parts: { team: ["select"] },
    items: { root: ["press"] },
    when: { team: { hasPlayers: true }, root: { linked: true } },
  },
  read: (input, state, lang): string[] =>
    state === "empty"
      ? [sportsWordsFor(lang).boxScore.empty]
      : boxScoreReading(input as Parameters<typeof boxScoreReading>[0], lang),
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
    style: z.literal("linescore").optional(),
  })
  .refine(
    ({ columns, homePlayers, awayPlayers }) =>
      [...homePlayers, ...awayPlayers].every(({ stats }) => stats.length === columns.length),
    { path: ["columns"], message: "Provide one stat per column for each player" },
  );

function withPlayers(input: z.output<typeof schema>) {
  const hasPlayers = input.style !== "linescore";
  const rows = (side: (typeof sides)[number]) =>
    (side === "home" ? input.homePlayers : input.awayPlayers).map((row) => ({
      ...row,
      pos: input.detail === "brief" ? undefined : row.pos,
      linked: !!row.goto,
      visible: hasPlayers && input.team === side,
    }));
  return {
    ...input,
    hasPlayers,
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
    columns: ["MIN", "PTS", "REB", "AST"],
    homePlayers: [
      { name: "Amara Field", pos: "PG", stats: ["34", "23", "4", "8"], goto: "amara_field" },
      { name: "Noah Reed", pos: "C", stats: ["29", "16", "11", "2"] },
      { name: "Ella Woods", pos: "SG", stats: ["27", "14", "3", "4"] },
    ],
    awayPlayers: [{ name: "Sam Banks", pos: "SF", stats: ["36", "26", "8", "5"], goto: "sam_banks" }],
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
  read("Switch the player table to Fern House.", { address: "c1/team", action: "select" }),
  read("Open Amara Field's player profile.", { address: "c1/r1", action: "press" }),
] satisfies c.Probe[];

type BoxScoreProps = c.Props<typeof props, typeof meta>;
type BoxScoreView = { input: BoxScoreProps; density: c.AxisValue<"density">; loading: boolean };

function TableHeader(text: string, index: number, density: BoxScoreView["density"]) {
  return {
    id: String(index),
    label: text,
    header: <kit.KitLayoutText line={{ text, role: "meta", tone: "muted" }} align="end" density={density} />,
  };
}

function LineScore({ input, density }: Omit<BoxScoreView, "loading">) {
  const {
    words: { boxScore: words },
    lang,
  } = kit.useWords(sportsWordsFor);
  const columns = input.periods.map(({ label }, index) => TableHeader(label, index, density));
  const rows = sides.map((side) => ({
    id: side,
    label: input[side],
    heading: <kit.KitLayoutText line={{ text: input[side] }} density={density} />,
    cells: input.periods.map((period, index) => ({
      id: String(index),
      content: (
        <kit.KitLayoutText
          line={{ text: c.numberLine(period[side], lang), tabular: true }}
          align="end"
          density={density}
        />
      ),
    })),
  }));
  return (
    <kit.KitTable
      part="line_score"
      fitColumns
      {...{ rows, columns }}
      corner={
        <kit.KitLayoutText line={{ text: words.team, role: "meta", tone: "muted" }} density={density} />
      }
    />
  );
}

function PlayerTable({ input, density, loading }: BoxScoreView) {
  const {
    words: { boxScore: words },
  } = kit.useWords(sportsWordsFor);
  const columns = input.columns.map((label, index) => TableHeader(label, index, density));
  const rows = input.players
    .filter((row) => row.visible)
    .map((row) => ({
      id: row.id,
      label: row.name,
      ...(row.linked && !loading ? { target: { item: row.id, part: "root" } } : {}),
      heading: (
        <>
          <kit.KitLayoutText
            line={{ text: row.name, part: row.linked ? "name" : "root" }}
            density={density}
          />
          <kit.KitLayoutText
            line={{ text: row.pos, part: "position", role: "caption", tone: "muted" }}
            density={density}
          />
        </>
      ),
      cells: row.stats.map((stat, index) => ({
        id: String(index),
        content: <kit.KitLayoutText line={{ text: stat, tabular: true }} align="end" density={density} />,
      })),
    }));
  return (
    <kit.KitTable
      part="players"
      fitColumns
      {...{ rows, columns }}
      corner={
        <kit.KitLayoutText line={{ text: words.players, role: "meta", tone: "muted" }} density={density} />
      }
    />
  );
}

function ScoreHeader({ input, density }: Omit<BoxScoreView, "loading">) {
  const {
    words: { boxScore: words },
    lang,
  } = kit.useWords(sportsWordsFor);
  const score = words.scorePair(c.numberLine(input.totals.home, lang), c.numberLine(input.totals.away, lang));
  return (
    <kit.KitContent density={density}>
      <kit.KitHeader
        title={{ text: words.title, part: "title", role: "meta", tone: "muted" }}
        density={density}
      />
      <kit.KitFigure
        value={{ text: score, part: "total" }}
        caption={
          <kit.KitLayoutText
            line={{ text: words.teams(input.home, input.away), role: "meta" }}
            density={density}
          />
        }
        density={density}
      />
    </kit.KitContent>
  );
}

export function BoxScore(input: BoxScoreProps) {
  const {
    words: { boxScore: words },
  } = kit.useWords(sportsWordsFor);
  const state = kit.useComponentState();
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const loading = state === "loading";
  const view = { input, density, loading };
  const body = (
    <>
      <ScoreHeader {...view} />
      <LineScore {...view} />
      {input.hasPlayers && (
        <kit.KitContent group="response" density={density}>
          <kit.KitTrack part="team" role="radiogroup" look="segments" label={words.switchTeam}>
            {input.teamChoices.map(({ value, label }) => (
              <kit.KitChip
                key={value}
                item={null}
                role="radio"
                look="segment"
                label={label}
                value={value}
                on={input.team === value}
                disabled={loading ? false : undefined}
              />
            ))}
          </kit.KitTrack>
          <PlayerTable {...view} />
        </kit.KitContent>
      )}
    </>
  );
  return (
    <kit.KitCard part="root" padded clip density={density} surface={surface}>
      <kit.KitState part="empty" message={words.empty} density={density} loading={body}>
        {body}
      </kit.KitState>
    </kit.KitCard>
  );
}
