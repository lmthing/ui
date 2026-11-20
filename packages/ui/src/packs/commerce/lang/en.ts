export type CommerceWords = {
  addProduct: (name: string) => string;
  emptyProducts: string;
  priceChange: (was: string, price: string) => string;
  orderNumber: (number: string) => string;
  orderMode: Record<"pickup" | "delivery" | "table", string>;
  orderTotal: string;
  reorder: string;
  receiptSeparator: string;
  variantUnavailable: string;
  variantReading: (label: string, details: readonly string[]) => string;
};

export const en = {
  addProduct: (name) => `Add ${name} to basket`,
  emptyProducts: "No products to show",
  priceChange: (was, price) => `${was} → ${price}`,
  orderNumber: (number) => `Order #${number}`,
  orderMode: { pickup: "Pickup", delivery: "Delivery", table: "At table" },
  orderTotal: "Total",
  reorder: "Reorder",
  receiptSeparator: " · ",
  variantUnavailable: "Sold out",
  variantReading: (label, details) => [label, ...details].join(" · "),
} satisfies CommerceWords;
