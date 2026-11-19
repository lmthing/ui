import { en, type Words } from "./en";

export type { Words } from "./en";
export type { LDMLPluralRule } from "./plural";

export const defaultLang = en.tag;

export function localeOf(lang: string = defaultLang): string {
  try {
    return Intl.getCanonicalLocales(lang)[0] ?? defaultLang;
  } catch {
    return defaultLang;
  }
}

/** Register a complete dictionary for a locale and return an unregister function. */
export function languageLookup<T>(english: T) {
  const languages = new Map<string, T>();
  return {
    words(lang?: string): T {
      const locale = localeOf(lang);
      return languages.get(locale) ?? languages.get(locale.split("-")[0]!) ?? english;
    },
    register(lang: string, words: T): () => void {
      const locale = localeOf(lang);
      languages.set(locale, words);
      return () => {
        if (languages.get(locale) === words) languages.delete(locale);
      };
    },
  };
}

const core = languageLookup<Words>(en);
export const wordsFor = core.words;
export const registerWords = core.register;

/** Keep the original day-first date format for the default English app. */
export function dateLocaleOf(lang?: string): string {
  const locale = localeOf(lang);
  return locale === defaultLang ? en.dateTag : locale;
}
