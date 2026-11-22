export const leaseRenewalLabel = <Key extends string>(words: Record<Key, string>, key: Key): string =>
  words[key];
