export const en = {
  variantUnavailable: "Sold out",
  variantReading: (label: string, details: readonly string[]) => [label, ...details].join(" · "),
};

export type CommerceWords = typeof en;
