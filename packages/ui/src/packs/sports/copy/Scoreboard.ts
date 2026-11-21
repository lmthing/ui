import { clockLine, numberLine, type AxisValue, type StateName } from "../../../catalog";
import { sportsWordsFor, type SportsWords } from "../lang";

type ScoreInput = {
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
  status: keyof SportsWords["scoreboard"]["status"];
  elapsed?: number;
};

export function scoreboardCopy(input: ScoreInput, lang?: string) {
  const { scoreboard } = sportsWordsFor(lang);
  const home = numberLine(input.homeScore, lang);
  const away = numberLine(input.awayScore, lang);
  return { home, away, status: scoreboard.status[input.status], clock: clockLine(input.elapsed ?? 0, lang) };
}

export function scoreboardReading(raw: unknown, state: StateName, lang?: string): string[] {
  if (state !== "filled") return [];
  const input = raw as ScoreInput & { period?: string; detail?: AxisValue<"detail"> };
  const { scoreboard } = sportsWordsFor(lang);
  const { home, away, status, clock } = scoreboardCopy(input, lang);
  return [
    scoreboard.score(input.home, home, away, input.away),
    status,
    clock,
    ...(input.period && input.detail !== "brief" ? [input.period] : []),
  ];
}
