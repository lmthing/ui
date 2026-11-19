import { numberLine } from "../format";
import { wordsFor } from "../lang";

function thingPlural(thingType: string | undefined, lang?: string): string {
  const word = thingType?.replace(/[_-]+/g, " ").trim().toLocaleLowerCase();
  return word ? wordsFor(lang).pluralThing(word) : "";
}

/** Empty-state line for known things, or the language's neutral line. */
export function emptyLine(thingType?: string, lang?: string): string {
  const words = wordsFor(lang);
  const things = thingPlural(thingType, lang);
  return things ? words.empty(things) : words.nothing;
}

export function searchLine(thingType?: string, lang?: string): string {
  return wordsFor(lang).search(thingPlural(thingType, lang));
}

export const {
  loadingLabel,
  photoLabels,
  sendLabel,
  closeLabel,
  confirmNote,
  confirmLabel,
  cancelLabel,
  mediaUnavailable,
  swipeLabels,
  allLabel,
  historyDetailLine,
  loyaltyLabels,
} = wordsFor();

export function charLine(used: number, max: number, lang?: string): string {
  return wordsFor(lang).charCount(numberLine(used, lang), numberLine(max, lang));
}

/** Keep a short final word with the word before it, without changing the copy. */
export const balancedLine = (text: string): string => text.replace(/ (\S+)$/, "\u00a0$1");
