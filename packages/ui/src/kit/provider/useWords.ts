import { wordsFor } from "../../catalog";
import { useKit } from "./useKit";

/** One language tag and its words; a pack supplies its own dictionary lookup. */
export function useWords(): { lang: string; words: ReturnType<typeof wordsFor> };
export function useWords<T>(lookup: (lang: string) => T): { lang: string; words: T };
export function useWords<T>(lookup?: (lang: string) => T) {
  const { lang } = useKit();
  return { lang, words: (lookup ?? wordsFor)(lang) };
}
