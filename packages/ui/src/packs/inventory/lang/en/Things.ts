export const words = {
  things: {
    low: "Low stock",
    priceStockSeparator: " · ",
    stocked: "Nothing needs restocking",
    quantity: (count: string) => `Quantity: ${count}`,
    minimum: (count: string) => `Minimum: ${count}`,
    less: (name: string) => `Decrease quantity, ${name}`,
    more: (name: string) => `Increase quantity, ${name}`,
    reading: (fields: string[]) => fields.join(" · "),
  },
};
