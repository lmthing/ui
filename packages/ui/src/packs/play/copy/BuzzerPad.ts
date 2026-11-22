import { numberLine, type BuzzRound } from "../../../catalog";
import { playWordsFor } from "../lang";

type Player = { id: string; name: string };

export function buzzerPadCopy<P extends Player>(players: readonly P[], round?: BuzzRound, lang?: string) {
  const words = playWordsFor(lang).buzzerPad;
  const winner = players.find(({ id }) => id === round?.winner);
  const pads = players.map((player) => {
    const first = player.id === winner?.id;
    const milliseconds = round?.deltas[player.id];
    const time = milliseconds === undefined || first ? undefined : numberLine(Math.round(milliseconds), lang);
    const delta = time === undefined ? undefined : words.delta(time);
    return {
      ...player,
      first,
      used: milliseconds !== undefined,
      delta,
      time,
      caption: delta ?? (first ? words.first : words.tap),
    };
  });
  return {
    status: winner ? words.winner(winner.name) : words.waiting,
    reset: words.reset,
    pads,
  };
}
