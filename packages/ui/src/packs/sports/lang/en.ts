import { words as BoxScoreWords } from "./en/BoxScore";
import { words as MatchStatsWords } from "./en/MatchStats";
import { words as MomentumChartWords } from "./en/MomentumChart";
import { words as BracketWords } from "./en/Bracket";
import { words as ScoreboardWords } from "./en/Scoreboard";
import { words as FixturesWords } from "./en/Fixtures";
import { words as LineupWords } from "./en/Lineup";
import { words as MatchFeedWords } from "./en/MatchFeed";
import { words as SquadWords } from "./en/Squad";
import { words as StandingsWords } from "./en/Standings";
export const en = {
  ...BracketWords,
  ...ScoreboardWords,
  ...FixturesWords,
  ...LineupWords,
  ...MatchFeedWords,
  ...SquadWords,
  ...StandingsWords,
  ...BoxScoreWords,
  ...MatchStatsWords,
  ...MomentumChartWords,
};

export type SportsWords = typeof en;
