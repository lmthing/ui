import { localeOf, numberLine } from "../../../catalog";
import { sportsWordsFor } from "../lang";

export const summaryStats = ["played", "difference"] as const;
export const resultStats = ["won", "drawn", "lost"] as const;
export const percentageStats = ["played", "games_behind"] as const;
const readingStats = ["position", "played", ...resultStats, "difference", "points"] as const;
const percentageReadingStats = ["position", "played", ...resultStats, "percentage", "games_behind"] as const;

type RecordRow = {
  id: string;
  team: string;
  won: number;
  drawn: number;
  lost: number;
  for: number;
  against: number;
  form: readonly ("w" | "d" | "l")[];
};
type StandingsInput = {
  rows: readonly RecordRow[];
  scoring: { win: number; draw: number };
  mine?: number | undefined;
  lines: readonly number[];
  format?: "football_pts" | "pct_gb" | undefined;
  group?: string | undefined;
};

export function standingsCopy({ rows, scoring, mine, lines, format }: StandingsInput, lang?: string) {
  const words = sportsWordsFor(lang).standings;
  const percentage = new Intl.NumberFormat(localeOf(lang), { style: "percent", maximumFractionDigits: 1 });
  const ranked = rows
    .map((row, index) => {
      const played = row.won + row.drawn + row.lost;
      return {
        ...row,
        mine: index === mine,
        played,
        difference: row.for - row.against,
        points: row.won * scoring.win + row.drawn * scoring.draw,
        ratio: played ? (row.won + row.drawn / 2) / played : 0,
      };
    })
    .sort((a, b) =>
      format === "pct_gb"
        ? Number(b.played > 0) - Number(a.played > 0) || b.ratio - a.ratio
        : b.points - a.points || b.difference - a.difference || b.for - a.for,
    );
  const leader = ranked[0];
  const lead = leader ? leader.won - leader.lost : 0;
  return {
    cuts: lines.flatMap((line) => (ranked[line - 1] ? [ranked[line - 1]!.id] : [])),
    rows: ranked.map(
      ({ id, team, mine, form, played, won, drawn, lost, difference, points, ratio }, index) => ({
        id,
        team,
        mine,
        form: form.map((outcome) => words.outcomes[outcome]).join(words.formSeparator) || words.noForm,
        position: numberLine(index + 1, lang),
        played: numberLine(played, lang),
        won: numberLine(won, lang),
        drawn: numberLine(drawn, lang),
        lost: numberLine(lost, lang),
        difference: numberLine(difference, lang),
        points: numberLine(points, lang),
        percentage: played ? percentage.format(ratio) : words.noForm,
        games_behind:
          !played || lead === won - lost ? words.noForm : numberLine((lead - won + lost) / 2, lang),
      }),
    ),
  };
}

export function standingsReading(input: StandingsInput & { detail?: string }, lang?: string): string[] {
  const words = sportsWordsFor(lang).standings;
  const detail = input.detail !== "brief";
  const percentage = input.format === "pct_gb";
  const headings = [
    words.title,
    ...(input.group ? [input.group] : []),
    input.format !== undefined || input.group !== undefined ? words.records : words.scroll,
    words.position,
    words.team,
    percentage ? words.percentage : words.pointsSuffix,
    ...(percentage ? percentageStats : summaryStats).map((stat) => words[stat]),
    ...resultStats.map((stat) => (percentage && stat === "drawn" ? words.tied : words[stat])),
    ...(detail ? [words.form] : []),
  ];
  return [
    ...standingsCopy(input, lang).rows.map((row) =>
      [
        words.reading(row.id, row.team),
        ...(percentage ? percentageReadingStats : readingStats).map((stat) => row[stat]),
        ...(detail ? [row.form] : []),
      ].join(words.separator),
    ),
    headings.join(words.separator),
  ];
}
