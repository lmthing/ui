import { numberLine, pluralForm } from "../../../catalog";
import { playWordsFor } from "../lang";

type ScoreInput = {
  players: readonly { name: string }[];
  rounds: readonly {
    label: string;
    points: readonly (number | null)[];
    bids?: readonly (number | null)[] | undefined;
  }[];
  goal?: number | undefined;
  wins: "high" | "low";
  overflow: "all" | "page";
  selectedRound?: string | undefined;
  share: boolean;
};

export function scoreGoalCopy({ goal, players, rounds, wins }: ScoreInput, lang?: string) {
  if (goal === undefined) return;
  const labels = playWordsFor(lang).scoreLabels;
  const reached = players.flatMap(({ name }, index) => {
    const scores = rounds.flatMap(({ points }) => (points[index] == null ? [] : [points[index]]));
    const total = scores.reduce((sum, score) => sum + score, 0);
    return scores.length && (wins === "high" ? total >= goal : total <= goal) ? [name] : [];
  });
  return {
    target: labels.target(numberLine(goal, lang)),
    reached: reached.length ? labels.reached(reached) : undefined,
  };
}

export function scoreBidLine(bid: number | null, lang?: string): string {
  const { bid: label, unplayed } = playWordsFor(lang).scoreLabels;
  return label(bid === null ? unplayed : numberLine(bid, lang));
}

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
    progress: words.scoreProgress(
      numberLine(completed, lang),
      numberLine(rounds.length, lang),
      pluralForm(rounds.length, lang),
    ),
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

export function scoreReading(input: ScoreInput, lang?: string, readonly = false) {
  const { scoreLabels: labels, scoreReadCell } = playWordsFor(lang);
  const copy = scoreCopy(input, lang);
  const goal = scoreGoalCopy(input, lang);
  const selected = Number(input.selectedRound ?? "1") - 1;
  const visible = input.overflow === "page" ? input.rounds.slice(selected, selected + 1) : input.rounds;
  const showBids = visible.some(({ bids }) => bids !== undefined);
  const board = [
    labels.title,
    copy.progress,
    ...(goal ? [goal.target, ...(goal.reached ? [goal.reached] : [])] : []),
    labels.player,
    labels.total,
    ...(readonly ? visible : input.rounds).map(({ label }) => label),
    ...copy.players.map(({ name, total, standing }) =>
      [name, `${labels.total}: ${total}`, standing].filter(Boolean).join(" · "),
    ),
    ...(readonly ? [] : [labels.reset, ...(input.share ? [labels.share] : [])]),
  ];
  const cells = visible.flatMap(({ label, points, bids }) =>
    points.map((score, player) => {
      const value = score === null ? labels.unplayed : numberLine(score, lang);
      const cell = showBids
        ? `${scoreBidLine(bids?.[player] ?? null, lang)} · ${labels.made}: ${value}`
        : value;
      return scoreReadCell(input.players[player]!.name, label, cell);
    }),
  );
  return [...board, ...cells];
}
