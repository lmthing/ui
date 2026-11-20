import { numberLine, type SessionState } from "../../../catalog";
import { playWordsFor } from "../lang";

export function turnOrderLines(
  setup: { players: readonly { name: string }[]; laps?: number | undefined },
  current: Pick<Extract<SessionState, { kind: "turns" }>, "index" | "lap" | "direction">,
  complete: boolean,
  lang?: string,
) {
  const words = playWordsFor(lang).turnOrder;
  const direction = current.direction === "forward" ? words.forward : words.reverseDirection;
  const lap = numberLine(current.lap, lang);
  const name = setup.players[current.index]!.name;
  return {
    status: complete ? words.complete : words.current,
    player: complete ? words.lastPlayer(name) : name,
    lap:
      setup.laps === undefined
        ? words.lap(lap, direction)
        : words.boundedLap(lap, numberLine(setup.laps, lang), direction),
  };
}
