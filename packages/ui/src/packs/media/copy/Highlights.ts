import { mediaWordsFor } from "../lang";

export function highlightQuote(text: string, lang?: string): string {
  return mediaWordsFor(lang).highlights.quote(text);
}
