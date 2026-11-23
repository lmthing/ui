import { numberLine, type DrawState } from "../../../catalog";
import { playWordsFor } from "../lang";

export type DeckCard = { title: string; tag?: string | undefined; body?: string | undefined };

export function cardDeckCopy(cards: readonly DeckCard[], draw?: DrawState, lang?: string) {
  const words = playWordsFor(lang).cardDeck;
  const state = draw?.kind === "deck" ? draw : undefined;
  const remaining = state?.remaining ?? cards.length;
  const discarded = state?.discard.length ?? 0;
  const revealed = (state?.drawn ?? []).flatMap((index) => (cards[index] ? [cards[index]] : []));
  const remainingValue = numberLine(remaining, lang);
  const discardedValue = numberLine(discarded, lang);
  return {
    remaining: words.remaining(remainingValue),
    discarded: words.discarded(discardedValue),
    remainingValue,
    discardedValue,
    revealed,
    exhausted: remaining === 0,
    hasDiscards: discarded > 0,
  };
}
