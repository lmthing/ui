import { goalLine, numberLine } from "../../../catalog";
import { sportsWordsFor } from "../lang";

type SquadInput = {
  needed: number;
  detail?: string;
  players: readonly {
    name: string;
    answer: "yes" | "maybe" | "no" | "none";
    reason?: string | undefined;
    picked: boolean;
  }[];
};

export function squadSummary({ players, needed }: SquadInput, lang?: string) {
  const count = players.filter(({ answer }) => answer === "yes").length;
  return `${numberLine(count, lang)} ${goalLine(needed, lang)}`;
}

export function squadReading(input: SquadInput, lang?: string): string[] {
  const words = sportsWordsFor(lang).squad;
  return [
    `${words.available}${words.separator}${squadSummary(input, lang)}`,
    ...input.players.map(({ name, answer, reason, picked }) =>
      [
        words.row(name, words.answers[answer]),
        ...(reason && input.detail !== "brief" ? [reason] : []),
        ...(picked ? [words.picked] : []),
      ].join(words.separator),
    ),
  ];
}
