import { numberLine } from "../../../catalog";
import { playWordsFor } from "../lang";

type ScoreInput = {
  players: readonly { name: string }[];
  rounds: readonly { label: string; points: readonly (number | null)[] }[];
  wins: "high" | "low";
  style: "grid" | "round";
  selectedRound?: string | undefined;
  share: boolean;
};

export function scoreCopy(input: ScoreInput, lang?: string) {
  const { players, rounds, wins } = input;
  const words = playWordsFor(lang);
  const completed = rounds.filter(({ points }) => points.every((score) => score !== null)).length;
  const finished = completed === rounds.length;
  const totals = players.map((_, index) =>
    rounds.reduce((total, { points }) => total + (points[index] ?? 0), 0),
  );
  const ordered = [...totals].sort((a, b) => (wins === "high" ? b - a : a - b));
  const tied = ordered[0] === ordered[1];
  const places = totals.map((total) => ordered.indexOf(total) + 1);
  return {
    progress: words.scoreProgress(numberLine(completed, lang), numberLine(rounds.length, lang)),
    players: players.map(({ name }, index) => {
      const played = rounds.some(({ points }) => points[index] != null);
      const place = places[index]!;
      const winner = finished && place === 1;
      return {
        name,
        total: played ? numberLine(totals[index]!, lang) : words.scoreLabels.unplayed,
        winner,
        standing: winner
          ? tied
            ? words.scoreTie
            : words.scoreWinner
          : finished
            ? words.scorePlace(numberLine(place, lang))
            : undefined,
      };
    }),
  };
}

export function scoreReading(input: ScoreInput, lang?: string) {
  const { scoreLabels: labels, scoreReadCell } = playWordsFor(lang);
  const copy = scoreCopy(input, lang);
  const board = [
    labels.title,
    copy.progress,
    labels.player,
    labels.total,
    ...input.rounds.map(({ label }) => label),
    ...copy.players.map(({ name, total, standing }) =>
      [name, `${labels.total}: ${total}`, standing].filter(Boolean).join(" · "),
    ),
    labels.reset,
    ...(input.share ? [labels.share] : []),
  ];
  const selected = Number(input.selectedRound ?? "1") - 1;
  const cells = input.rounds.flatMap(({ label, points }, round) =>
    input.style === "round" && round !== selected
      ? []
      : points.map((score, player) =>
          scoreReadCell(
            `r${round * input.players.length + player + 1}`,
            input.players[player]!.name,
            label,
            score === null ? labels.notPlayed : numberLine(score, lang),
          ),
        ),
  );
  return [...board, ...cells];
}
