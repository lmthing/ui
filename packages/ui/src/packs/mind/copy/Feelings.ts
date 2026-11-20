import { clip, numberLine, placeholderTitle } from "../../../catalog";
import { mindWordsFor } from "../lang";

export function feelingCountLine(remaining: number, lang?: string): string {
  return mindWordsFor(lang).feelings.remaining(numberLine(remaining, lang));
}

export function feelingPlaceholder(family: number, at: number, lang?: string): string {
  return clip(
    mindWordsFor(lang).feelings.placeholder(placeholderTitle(family, lang), numberLine(at + 1, lang)),
    16,
  );
}

type ReadFamily = { label: string; word_controls?: { label: string }[] };

export function readFeelings(
  families: readonly ReadFamily[],
  parent: number,
  full: boolean,
  lang?: string,
): string[] {
  const { title, hint, noWords } = mindWordsFor(lang).feelings;
  return [
    JSON.stringify(title),
    ...(full ? [JSON.stringify(hint)] : []),
    ...families.map(({ label, word_controls = [] }, index) => {
      const row = `r${index + 1} ${JSON.stringify(label)}`;
      if (!word_controls.length) return index === parent ? `${row}: ${JSON.stringify(noWords)}` : row;
      return `${row}: ${word_controls.map(({ label }, at) => `word_${at + 1} ${JSON.stringify(label)}`).join(", ")}`;
    }),
  ];
}
