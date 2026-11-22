import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { resultStats, standingsCopy, standingsReading, summaryStats } from "../copy";
import { sportsWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-Standings.generated";

// Core first: List/lead:number ranks one value, not a table of played, wins, draws, losses and form.
export const meta = {
  id: "Standings",
  status: "ready",
  group: "data",
  ...prompt,
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  partTiers: { root: "people" },
  realPath: "The organiser enters results on one phone; sharing the league across clubs needs a shared app.",
  variants: { density: ["comfortable", "compact"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["form"] } },
  parts: ["root", "title", "hint", "table"],
  items: {
    key: "rows",
    parts: ["root", "position", "team", "played", "won", "drawn", "lost", "difference", "points", "form"],
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
    density: "compact",
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
  read("Open the league table row for Ledge Rovers", { address: "s1/r2", action: "press" }),
] satisfies c.Probe[];

type StandingsProps = c.Props<typeof props, typeof meta>;

// prettier-ignore
export function Standings(input: StandingsProps) {
  const { lang, words: { standings: words } } = kit.useWords(sportsWordsFor);
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const loading = kit.useComponentState() === "loading";
  const { rows, cuts } = standingsCopy(input, lang);
  const head = (text: string) => <kit.KitText role="label" tone="muted" align="center" part={null}
    density={density}>{text}</kit.KitText>;
  const column = (id: string, label: string, stats: typeof summaryStats | typeof resultStats) => ({
    id, label, header: loading ? head(stats.map((stat) => words[stat]).join(words.formSeparator)) :
      <kit.KitGrid columns={stats.length} density={density}>{stats.map((stat) =>
        <kit.KitText key={stat} role="label" tone="muted" part={null} density={density}>{words[stat]}</kit.KitText>,
      )}</kit.KitGrid>,
  });
  const columns = [column("summary", words.summary, summaryStats), column("results", words.results, resultStats)];
  if (detail === "full") columns.unshift({ id: "form", label: words.form, header: head(words.form) });
  const tableRows = rows.map((row) => {
    const cells = [summaryStats, resultStats].map((stats) => ({ id: String(stats[0]), content: loading
      ? head(stats.map((stat) => row[stat]).join(words.formSeparator))
      : <kit.KitGrid columns={stats.length} density={density}>{stats.map((stat) =>
        <kit.KitText key={stat} part={stat} role="label" tone="muted" tabular density={density}>{row[stat]}</kit.KitText>,
      )}</kit.KitGrid>,
    }));
    if (detail === "full") cells.unshift({ id: "form", content: loading ? head(row.form) :
      <kit.KitTrail kind="badge" part="form" value={row.form} tone="text" density={density} /> });
    return {
      id: row.id, label: row.team, target: { item: row.id, part: "root" }, selected: row.mine,
      heading: <>
        <kit.KitText role="label" part={loading ? null : "team"} lines={1} density={density}>{row.team}</kit.KitText>
        {loading ? <kit.KitText part={null} role="label" density={density}>{words.rowSummary(row.position, row.points)}</kit.KitText> :
          <kit.KitContent density={density} lineRole="body" lead={
            <kit.KitText role="label" part={null} tone="muted" density={density}>
              {words.position}<kit.KitText part="position" role="label" tone="muted" density={density} tabular>{row.position}</kit.KitText>
            </kit.KitText>
          }>
            <kit.KitText role="label" part={null} tone="muted" density={density} lines={1}>
              <kit.KitText part="points" role="number" numberScale="compact" tabular
                density={density}>{row.points}</kit.KitText> {words.pointsSuffix}
            </kit.KitText>
          </kit.KitContent>}
      </>, cells,
    };
  });
  return <kit.KitCard part="root" padded clip density={density}>
    {loading ? <kit.KitSkeleton shape="figure" inset="none" density={density}
      content={[["heading", words.title], ["label", words.scroll]]} /> :
      <kit.KitContent density={density}>
        <kit.KitText part="title" role="heading" density={density}>{words.title}</kit.KitText>
        <kit.KitText part="hint" role="label" tone="muted" density={density}>{words.scroll}</kit.KitText>
      </kit.KitContent>}
    <kit.KitTable part="table" columns={columns} rows={tableRows} separators={loading ? [] : cuts} loading={loading}
      corner={<kit.KitText role="label" tone="muted" part={null} density={density}>{words.team}</kit.KitText>} />
  </kit.KitCard>;
}
