/** Shared kitchen control labels, also included in data-only draft readings. */
export const kitchenLabels = {
  newItem: "Type a new grocery item",
  timer: "Cooking timer",
} as const;

/** Tie grouped draft content to the stable row addresses exposed by the reader. */
export const kitchenItemLine = (index: number, label: string): string => `r${index + 1}: ${label}`;
