import { numberLine } from "../../../catalog";
import { sportsWordsFor } from "../lang";

type Tie = {
  id: string;
  round: string;
  a: string;
  b: string;
  aScore?: number | undefined;
  bScore?: number | undefined;
};
type Bracket = {
  rounds: readonly { label: string; ties: readonly Pick<Tie, "a" | "b">[] }[];
  ties: readonly Tie[];
  mine?: string | undefined;
  detail?: "full" | "brief";
};

function winnerOf({ aScore, bScore }: Tie): 0 | 1 | undefined {
  if (aScore === undefined || bScore === undefined || aScore === bScore) return undefined;
  return aScore > bScore ? 0 : 1;
}

function scoreText(value: number | undefined, brief: boolean, lang?: string) {
  return value === undefined || brief ? undefined : numberLine(value, lang);
}

function drawSide(label: string, part: "a" | "b", score: string | undefined) {
  return { label, labelPart: part, scorePart: `${part}_score`, ...(score === undefined ? {} : { score }) };
}

function drawTie(tie: Tie, brief: boolean, mine: string | undefined, lang?: string) {
  const { id, a, b, aScore, bScore } = tie;
  const winner = winnerOf(tie);
  return {
    id,
    target: { item: id, part: "root" },
    roundPart: "round",
    sides: [
      drawSide(a, "a", scoreText(aScore, brief, lang)),
      drawSide(b, "b", scoreText(bScore, brief, lang)),
    ] as const,
    selected: a === mine || b === mine,
    ...(winner === undefined
      ? {}
      : { winner, winnerLabel: sportsWordsFor(lang).bracket.winner(winner === 0 ? a : b) }),
  };
}

export function bracketDrawing({ rounds, ties, detail, mine }: Bracket, lang?: string) {
  let offset = 0;
  const drawing = rounds.map(({ label, ties: rows }, index) => {
    const group = ties.slice(offset, offset + rows.length);
    offset += rows.length;
    return {
      id: group[0]?.id ?? `round${index}`,
      label,
      ties: group.map((tie) => drawTie(tie, detail === "brief", mine, lang)),
    };
  });
  const links = drawing.flatMap(({ ties }, index) =>
    ties.flatMap(({ id, sides, winner }) => {
      if (winner === undefined) return [];
      const name = sides[winner].label;
      const matches = drawing[index + 1]?.ties.filter((tie) => tie.sides.some((side) => side.label === name));
      return matches?.length === 1 ? [{ from: id, to: matches[0]!.id }] : [];
    }),
  );
  return { rounds: drawing, links };
}

export function bracketReading({ ties, detail }: Pick<Bracket, "ties" | "detail">, lang?: string) {
  const words = sportsWordsFor(lang).bracket;
  const side = (name: string, value?: number) => {
    const text = scoreText(value, detail === "brief", lang);
    return text === undefined ? name : words.side(name, text);
  };
  return ties.map((tie) => {
    const { id, round, a, b, aScore, bScore } = tie;
    const line = words.tie(id, round, side(a, aScore), side(b, bScore));
    const winner = winnerOf(tie);
    return winner === undefined ? line : words.outcome(line, words.winner(winner === 0 ? a : b));
  });
}
