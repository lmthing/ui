import { wordsFor } from "../lang";

export const { placeholderTitles, placeholderDetail, placeholderLabel, placeholderValue } = wordsFor();

export function placeholderTitle(index: number, lang?: string): string {
  const titles = wordsFor(lang).placeholderTitles;
  return titles[index % titles.length]!;
}
