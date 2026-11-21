import type { ScreenLike } from "../../catalog";
import { MatchFeed, Scoreboard } from "./components";

/** Check the two valid seeds when they appear together on a match screen. */
export function checkMatchScore(screen: ScreenLike): string[] {
  const scoreLine = screen.components.find(({ c }) => c === "Scoreboard");
  const feedLine = screen.components.find(({ c }) => c === "MatchFeed");
  if (!scoreLine || !feedLine) return [];
  const score = Scoreboard.props.safeParse(inputOf(scoreLine));
  const feed = MatchFeed.props.safeParse(inputOf(feedLine));
  if (!score.success || !feed.success) return []; // The component schemas report invalid lines.
  const goals = { home: 0, away: 0 };
  for (const event of feed.data.events) if (event.kind === "goal") goals[event.side]++;
  return [
    ...(score.data.homeScore === goals.home ? [] : ["Home score does not match the seeded home goals."]),
    ...(score.data.awayScore === goals.away ? [] : ["Away score does not match the seeded away goals."]),
  ];
}

function inputOf({ c: _c, id: _id, state: _state, ...input }: ScreenLike["components"][number]) {
  return input;
}
