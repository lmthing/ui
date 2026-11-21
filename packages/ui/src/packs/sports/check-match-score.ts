import type { Issue, ScreenLike } from "../../catalog";
import { MatchFeed, Scoreboard } from "./components";
import { matchScore, seededMatch } from "./match-record";

/** Validate that wire scores agree with the match record initialised from the feed. */
export function checkMatchScore(screen: ScreenLike): Issue[] {
  const scoreLines = screen.components.filter(({ c }) => c === "Scoreboard");
  const feedLine = screen.components.find(({ c }) => c === "MatchFeed");
  if (!scoreLines.length || !feedLine) return [];
  const feed = MatchFeed.props.safeParse(inputOf(feedLine));
  if (!feed.success) return []; // The component schemas report invalid lines.
  const goals = matchScore(seededMatch(screen.id, feed.data.events).goals);
  return scoreLines.flatMap((scoreLine) => {
    const score = Scoreboard.props.safeParse(inputOf(scoreLine));
    if (!score.success) return [];
    return (["home", "away"] as const).flatMap((side) =>
      score.data[`${side}Score`] === goals[`${side}Score`]
        ? []
        : [
            {
              code: "S.match_score",
              address: `${screen.id}/${scoreLine.id}/${side}_score`,
              message: `The ${side} score must equal the number of ${side} goals.`,
            },
          ],
    );
  });
}

function inputOf({ c: _c, id: _id, state: _state, ...input }: ScreenLike["components"][number]) {
  return input;
}
