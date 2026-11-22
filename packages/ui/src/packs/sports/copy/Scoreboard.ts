import { clockLine, numberLine, type AxisValue, type StateName } from "../../../catalog";
import { sportsWordsFor, type SportsWords } from "../lang";

type ScoreInput = {
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
  status: keyof SportsWords["scoreboard"]["status"];
  elapsed?: number;
  sport?: keyof SportsWords["scoreboard"]["sports"] | undefined;
  periods?: readonly { label: string; home: number; away: number }[] | undefined;
  possession?: "home" | "away" | undefined;
  outs?: number | undefined;
  balls?: number | undefined;
  strikes?: number | undefined;
  bases?: readonly (keyof SportsWords["scoreboard"]["baseNames"])[] | undefined;
};

export function scoreboardCopy(input: ScoreInput, lang?: string) {
  const { scoreboard } = sportsWordsFor(lang);
  const home = numberLine(input.homeScore, lang);
  const away = numberLine(input.awayScore, lang);
  const facts: { part: string; text: string }[] = [];
  if (input.sport) facts.push({ part: "sport", text: scoreboard.sports[input.sport] });
  if (input.possession)
    facts.push({ part: "possession", text: scoreboard.possession(input[input.possession]) });
  for (const part of ["outs", "balls", "strikes"] as const) {
    const value = input[part];
    if (value !== undefined) facts.push({ part, text: scoreboard.count(part, numberLine(value, lang)) });
  }
  if (input.bases) {
    const occupied = Object.keys(scoreboard.baseNames).filter(
      (base): base is keyof typeof scoreboard.baseNames =>
        input.bases?.some((name) => name === base) ?? false,
    );
    facts.push({ part: "bases", text: scoreboard.bases(occupied.map((base) => scoreboard.baseNames[base])) });
  }
  const periods = (input.periods ?? []).map(({ label, home, away }) => ({
    label,
    score: scoreboard.periodScore(numberLine(home, lang), numberLine(away, lang)),
  }));
  return {
    home,
    away,
    facts,
    periods,
    status: scoreboard.status[input.status],
    clock: clockLine(input.elapsed ?? 0, lang),
  };
}

export function scoreboardReading(raw: unknown, state: StateName, lang?: string): string[] {
  if (state !== "filled") return [];
  const input = raw as ScoreInput & { period?: string; detail?: AxisValue<"detail"> };
  const { scoreboard } = sportsWordsFor(lang);
  const { home, away, status, clock, facts, periods } = scoreboardCopy(input, lang);
  return [
    scoreboard.score(input.home, home, away, input.away),
    status,
    clock,
    ...(input.period && input.detail !== "brief" ? [input.period] : []),
    ...facts.map(({ text }) => text),
    ...(periods.length
      ? [scoreboard.periods, ...periods.map(({ label, score }) => scoreboard.periodLine(label, score))]
      : []),
  ];
}
