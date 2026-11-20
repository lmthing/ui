export const en = {
  things: {
    low: "Low stock",
    stocked: "Nothing needs restocking",
    quantity: (count: string) => `Quantity: ${count}`,
    minimum: (count: string) => `Minimum: ${count}`,
    less: (name: string) => `Decrease quantity, ${name}`,
    more: (name: string) => `Increase quantity, ${name}`,
    reading: (fields: string[]) => fields.join(" · "),
  },
  storage: {
    path: "Storage path",
    spots: "Storage spots",
    here: "Stored here",
    emptyHere: "Nothing stored here",
    countUnit: (form: Intl.LDMLPluralRule) => (form === "one" ? " item" : " items"),
  },
};

export type InventoryWords = typeof en;
