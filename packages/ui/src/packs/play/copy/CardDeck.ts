import { numberLine } from "../../../catalog";
import { playWordsFor } from "../lang";

export function cardDeckCounts(remaining: number, discarded: number, lang?: string) {
  const words = playWordsFor(lang).cardDeck;
  return [words.remaining(numberLine(remaining, lang)), words.discarded(numberLine(discarded, lang))];
}
