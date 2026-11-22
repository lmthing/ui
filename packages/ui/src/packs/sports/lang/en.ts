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
};

export type SportsWords = typeof en;
