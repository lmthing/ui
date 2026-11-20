export type CommerceWords = {
  addProduct: (name: string) => string;
  advanceOrder: (stage: string) => string;
  currentOrderStage: (stage: string) => string;
  emptyProducts: string;
  orderComplete: string;
  priceChange: (was: string, price: string) => string;
  orderNumber: (number: string) => string;
  orderMode: Record<"pickup" | "delivery" | "table", string>;
  orderTotal: string;
  reorder: string;
  receiptSeparator: string;
};

export const en = {
  addProduct: (name) => `Add ${name} to basket`,
  advanceOrder: (stage) => `Mark as ${stage}`,
  currentOrderStage: (stage) => `Current stage: ${stage}`,
  emptyProducts: "No products to show",
  orderComplete: "Order complete",
  priceChange: (was, price) => `${was} → ${price}`,
  orderNumber: (number) => `Order #${number}`,
  orderMode: { pickup: "Pickup", delivery: "Delivery", table: "At table" },
  orderTotal: "Total",
  reorder: "Reorder",
  receiptSeparator: " · ",
} satisfies CommerceWords;
