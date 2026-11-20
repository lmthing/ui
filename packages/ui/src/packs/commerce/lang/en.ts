export type CommerceWords = {
  addProduct: (name: string) => string;
  advanceOrder: (stage: string) => string;
  currentOrderStage: (stage: string) => string;
  emptyProducts: string;
  orderComplete: string;
  priceChange: (was: string, price: string) => string;
};

export const en = {
  addProduct: (name) => `Add ${name} to basket`,
  advanceOrder: (stage) => `Mark as ${stage}`,
  currentOrderStage: (stage) => `Current stage: ${stage}`,
  emptyProducts: "No products to show",
  orderComplete: "Order complete",
  priceChange: (was, price) => `${was} → ${price}`,
} satisfies CommerceWords;
