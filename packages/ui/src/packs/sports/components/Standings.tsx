import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { percentageStats, resultStats, standingsCopy, standingsReading, summaryStats } from "../copy";
import { sportsWordsFor } from "../lang";

// Core first: List/lead:number ranks one value, not a table of played, wins, draws, losses and form.
export const meta = {
  id: "Standings",
  status: "ready",
  group: "data",
  purpose: "Compare teams in a league and see our place in the season.",
  pick: "A league table with played, wins, draws, losses, goal difference, points and recent form. Not a ranking on one value (List) or a general records table (Table).",
  writeHints: [
    "Write wins, draws, losses and goals for and against; never write played, points, goal difference or rank. Mine is a zero-based index in the input rows; lines are one-based cut positions in the ordered table.",
    'To hide recent form, write detail "brief" and still supply the form data. Write density: null unless the person asks to change spacing. Omit scoring unless the league awards nonstandard points per win or draw.',
    'For standings by win percentage and games behind use format "pct_gb"; otherwise omit format or use "football_pts". Put the conference or division label in group, not in team names. For ties write drawn; when goal totals or recent form are unavailable use for: 0, against: 0 and form: [].',
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  partTiers: { root: "people" },
  realPath: "The organiser enters results on one phone; sharing the league across clubs needs a shared app.",
  variants: { density: ["comfortable", "compact"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["form"] } },
  parts: ["root", "title", "group", "hint", "table"],
  items: {
    key: "rows",
    parts: [
      "root",
      "position",
      "team",
      "played",
      "won",
      "drawn",
      "lost",
      "difference",
      "points",
      "form",
      "percentage",
      "games_behind",
    ],
  },
  states: ["filled", "loading"],
  emptyActions: [],
  actions: { items: { root: ["press"] } },
  read: (input, _state, lang): string[] => standingsReading(input as StandingsProps, lang),
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
    group: c.text(16).optional(),
    format: z.enum(["football_pts", "pct_gb"]).optional(),
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
  );

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
    format: "football_pts",
    mine: 1,
    lines: [1, 2],
    rows: [
      { team: "Fern House", won: 4, drawn: 1, lost: 0, for: 11, against: 2, form: ["w", "w", "d", "w", "w"] },
      {
        team: "Ledge Rovers",
        won: 3,
        drawn: 1,
        lost: 1,
        for: 8,
        against: 4,
        form: ["d", "w", "l", "w", "w"],
      },
      { team: "Garden Crew", won: 1, drawn: 1, lost: 3, for: 4, against: 8, form: ["l", "l", "w", "d", "l"] },
    ],
  },
  {
    group: "East Division",
    format: "pct_gb",
    mine: 1,
    rows: [
      { team: "River Rovers", won: 7, drawn: 0, lost: 4, for: 0, against: 0, form: ["w", "w", "l"] },
      { team: "Trot Town", won: 8, drawn: 0, lost: 2, for: 0, against: 0, form: ["w", "w", "w"] },
      { team: "North Rovers", won: 5, drawn: 1, lost: 4, for: 0, against: 0, form: ["d", "l", "w"] },
    ],
  },
  {
    density: "compact",
    group: "Two-point league",
    scoring: { win: 2, draw: 1 },
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
  {
    ...write(
      "Make a league standings table for East Division: Trot Town has 3 wins, a draw and a loss with 7 goals for, 4 against; River Rovers has 2 wins, a draw and 2 losses with 6 goals for, 6 against.",
    ),
    expectProps: { group: "East Division" },
  },
  {
    ...write(
      "Rank these basketball teams by winning percentage and games behind, not points: Trot Town is 8–2, River Rovers is 7–4. Neither team has ties, and I don't have their points for or against or recent form.",
    ),
    expectProps: { format: "pct_gb" },
  },
  read("Open the league table row for Ledge Rovers", { address: "s1/r2", action: "press" }),
] satisfies c.Probe[];

type StandingsProps = c.Props<typeof props, typeof meta>;
type TableRow = ReturnType<typeof standingsCopy>["rows"][number];
type Stats = typeof summaryStats | typeof resultStats | typeof percentageStats;

// prettier-ignore
function RankHeading({ row, density, percentage }: {
  row: TableRow; density: c.ThemeDensity; percentage: boolean;
}) {
  const { words: { standings: words } } = kit.useWords(sportsWordsFor);
  const value = percentage ? row.percentage : row.points;
  return <kit.KitContent density={density} rhythm="flush">
    <kit.KitLayoutText line={{ text: row.team, role: "meta", part: "team", lines: 1 }} density={density} />
    <kit.KitGrid density={density} fitLast>
      <RankNumber position={row.position} mark={words.position} density={density} />
      <kit.KitFigure density={density} align="end"
        value={{ text: value, part: percentage ? "percentage" : "points", compact: true }}
        {...(!percentage ? { unit: { text: words.pointsSuffix, role: "meta" as const } } : {})} />
    </kit.KitGrid>
  </kit.KitContent>;
}

function RankNumber({
  position,
  mark,
  density,
}: {
  position: string;
  mark: string;
  density: c.ThemeDensity;
}) {
  const loading = kit.useComponentState() === "loading";
  if (loading)
    return <kit.KitLayoutText density={density} line={{ text: `${mark}${position}`, role: "meta" }} />;
  return (
    <kit.KitText role="label" part={null} tone="muted" density={density}>
      {mark}
      <kit.KitText part="position" role="label" tone="muted" density={density} tabular>
        {position}
      </kit.KitText>
    </kit.KitText>
  );
}

// prettier-ignore
function StandingsTable({ input, density, showForm, loading, fitted }: {
  input: StandingsProps; density: c.ThemeDensity; showForm: boolean; loading: boolean; fitted: boolean;
}) {
  const { lang, words: { standings: words } } = kit.useWords(sportsWordsFor);
  const percentage = input.format === "pct_gb";
  const { rows, cuts } = standingsCopy(input, lang);
  const head = (text: string) => <kit.KitLayoutText line={{ text, role: "meta", tone: "muted" }} density={density} />;
  const labels = percentage ? { ...words, drawn: words.tied } : words;
  const statColumns: { id: string; label: string; stats: Stats }[] = [
    percentage ? { id: "summary", label: words.percentageSummary, stats: percentageStats } :
      { id: "summary", label: words.summary, stats: summaryStats },
    { id: "results", label: percentage ? words.percentageResults : words.results, stats: resultStats },
  ];
  const grid = (stats: Stats, row?: TableRow) =>
    <kit.KitGrid columns={stats.length} density={density}>{stats.map((stat) =>
      <kit.KitLayoutText key={stat} line={{ text: row?.[stat] ?? labels[stat], role: "meta",
        tone: "muted", part: row ? stat : null, tabular: !!row }} align="end" density={density} />,
    )}</kit.KitGrid>;
  const columns = statColumns.map(({ id, label, stats }) => ({ id, label, header: grid(stats) }));
  if (showForm) columns.splice(percentage ? 1 : 0, 0, { id: "form", label: words.form, header: head(words.form) });
  const tableRows = rows.map((row) => {
    const cells = statColumns.map(({ id, stats }) => ({ id, content: grid(stats, row) }));
    if (showForm) cells.splice(percentage ? 1 : 0, 0, { id: "form", content:
      <kit.KitTrail kind="badge" part="form" value={row.form} tone="text" density={density} /> });
    return { id: row.id, label: row.team, ...(!loading ? { target: { item: row.id, part: "root" }, selected: row.mine } : {}),
      heading: <RankHeading {...{ row, density, percentage }} />, cells };
  });
  return <kit.KitTable part="table" columns={columns} rows={tableRows} separators={loading ? [] : cuts} fitColumns={fitted}
    corner={fitted ? head(words.team) :
      <kit.KitLayoutText line={{ text: words.team, role: "meta", tone: "muted" }} align="center" density={density} />} />;
}

export function Standings(input: StandingsProps) {
  const {
    words: { standings: words },
  } = kit.useWords(sportsWordsFor);
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const loading = kit.useComponentState() === "loading";
  const fitted = input.format !== undefined || input.group !== undefined;
  const content = (
    <>
      <kit.KitHeader
        density={density}
        title={{ text: words.title, part: "title", ...(fitted ? {} : { role: "body", strong: true }) }}
        meta={[
          { text: input.group, part: "group" },
          { text: fitted ? words.records : words.scroll, part: "hint" },
        ]}
      />
      <StandingsTable {...{ input, density, loading, fitted }} showForm={detail === "full"} />
    </>
  );
  return (
    <kit.KitCard part="root" padded clip density={density}>
      <kit.KitState loading={content} density={density}>
        {content}
      </kit.KitState>
    </kit.KitCard>
  );
}
