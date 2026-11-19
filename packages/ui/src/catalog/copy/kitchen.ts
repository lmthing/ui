import { wordsFor } from "../lang";

export const { kitchenLabels } = wordsFor();

/** Tie grouped draft content to the stable row addresses exposed by the reader. */
export const kitchenItemLine = (index: number, label: string): string => `r${index + 1}: ${label}`;
