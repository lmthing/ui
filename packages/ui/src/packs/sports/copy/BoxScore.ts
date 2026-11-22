import { numberLine } from "../../../catalog";
import { sportsWordsFor } from "../lang";

export function boxScoreTotals(periods: readonly { home: number; away: number }[]) {
  return periods.reduce(
    (total, period) => ({ home: total.home + period.home, away: total.away + period.away }),
    { home: 0, away: 0 },
  );
}

type PlayerReading = { id: string; name: string; pos?: string | undefined; stats: string[] };
type BoxReading = {
  home: string;
  away: string;
  periods: readonly { label: string; home: number; away: number }[];
  totals: { home: number; away: number };
  style: "players" | "linescore";
  team: "home" | "away";
  columns: readonly string[];
  players: readonly PlayerReading[];
};

export function boxScoreReading(input: BoxReading, lang?: string): string[] {
  const words = sportsWordsFor(lang).boxScore;
  const { home, away, totals, periods } = input;
  const score = ({ label, home: h, away: a }: BoxReading["periods"][number]) =>
    words.score(label, home, numberLine(h, lang), away, numberLine(a, lang));
  const lines = [
    words.title,
    words.scorePair(numberLine(totals.home, lang), numberLine(totals.away, lang)),
    words.teams(home, away),
    words.team,
    score({ label: words.total, ...totals }),
    ...periods.map(score),
  ];
  if (input.style === "linescore") return lines;
  return [
    ...lines,
    words.selected(input[input.team]),
    ...input.columns,
    ...input.players.map(({ id, name, pos, stats }) =>
      words.player(
        id,
        name,
        pos,
        stats.map((stat, index) => words.stat(input.columns[index]!, stat)),
      ),
    ),
  ];
}
