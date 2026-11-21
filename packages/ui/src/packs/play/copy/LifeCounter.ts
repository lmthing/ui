import { numberLine } from "../../../catalog";
import { playWordsFor } from "../lang";

type Seed = {
  startingLife: number;
  players: readonly {
    name: string;
    life?: number | undefined;
    counters: readonly { label: string; value: number }[];
  }[];
};

export function lifeCounterLines({ startingLife, players }: Seed, lang?: string) {
  const { lifeLine, counterLine } = playWordsFor(lang).lifeCounter;
  return players.flatMap(({ name, life, counters }) => [
    lifeLine(name, numberLine(life ?? startingLife, lang)),
    ...counters.map(({ label, value }) => counterLine(label, numberLine(value, lang))),
  ]);
}
