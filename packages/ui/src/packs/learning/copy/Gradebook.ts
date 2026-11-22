export const gradebookLabel = <Key extends string>(words: Record<Key, string>, key: Key): string =>
  words[key];
