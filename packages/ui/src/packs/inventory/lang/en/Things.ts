export const words = {
  things: {
    low: "Low stock",
    priceStockSeparator: " · ",
    stocked: "Nothing needs restocking",
    complete: "No missing items",
    scan: "Scan a barcode or QR code",
    serial: (serial: string) => `Serial: ${serial}`,
    condition: (condition: "new" | "good" | "worn" | "damaged") =>
      ({ new: "New", good: "Good condition", worn: "Worn", damaged: "Damaged" })[condition],
    expected: "Expected",
    counted: "Counted",
    audit: (label: string, count: string) => `${label}: ${count}`,
    quantity: (count: string) => `Quantity: ${count}`,
    minimum: (count: string) => `Minimum: ${count}`,
    less: (name: string) => `Decrease quantity, ${name}`,
    more: (name: string) => `Increase quantity, ${name}`,
    reading: (fields: string[]) => fields.join(" · "),
  },
};
