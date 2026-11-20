import { numberLine, pluralForm } from "../../../catalog";
import { learningWordsFor } from "../lang";

export function cardsLeft(count: number, lang?: string): string {
  return learningWordsFor(lang).flashcard.left(numberLine(count, lang), pluralForm(count, lang));
}
