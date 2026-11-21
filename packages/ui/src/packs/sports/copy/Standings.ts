import { numberLine } from "../../../catalog";
import { sportsWordsFor } from "../lang";

export const summaryStats = ["played", "difference"] as const;
export const resultStats = ["won", "drawn", "lost"] as const;
const readingStats = ["position", "played", ...resultStats, "difference", "points"] as const;

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
};

export function standingsCopy({ rows, scoring, mine, lines }: StandingsInput, lang?: string) {
  const words = sportsWordsFor(lang).standings;
  const ranked = rows
    .map((row, index) => ({
      ...row,
      mine: index === mine,
      played: row.won + row.drawn + row.lost,
      difference: row.for - row.against,
      points: row.won * scoring.win + row.drawn * scoring.draw,
    }))
    .sort((a, b) => b.points - a.points || b.difference - a.difference || b.for - a.for);
  return {
    cuts: lines.flatMap((line) => (ranked[line - 1] ? [ranked[line - 1]!.id] : [])),
    rows: ranked.map(({ id, team, mine, form, played, won, drawn, lost, difference, points }, index) => ({
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
    })),
  };
}

export function standingsReading(input: StandingsInput & { detail?: string }, lang?: string): string[] {
  const words = sportsWordsFor(lang).standings;
  const detail = input.detail !== "brief";
  const headings = [
    words.title,
    words.scroll,
    words.position,
    words.team,
    words.pointsSuffix,
    ...summaryStats.map((stat) => words[stat]),
    ...resultStats.map((stat) => words[stat]),
    ...(detail ? [words.form] : []),
  ];
  return [
    ...standingsCopy(input, lang).rows.map((row) =>
      [
        words.reading(row.id, row.team),
        ...readingStats.map((stat) => row[stat]),
        ...(detail ? [row.form] : []),
      ].join(words.separator),
    ),
    headings.join(words.separator),
  ];
}
