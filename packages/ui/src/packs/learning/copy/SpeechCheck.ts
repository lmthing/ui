export const speechCheckLabel = <Key extends string>(words: Record<Key, string>, key: Key): string =>
  words[key];
