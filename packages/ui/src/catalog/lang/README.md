# catalog/lang

`en.ts` is the launch dictionary and defines `Words`. Other dictionaries must satisfy it.
`index.ts` resolves registered tags (then the base language, then English).
Core views use `useWords()`; data-only code calls `wordsFor(lang)`.
Keep locale defaults and language-specific grammar here.
