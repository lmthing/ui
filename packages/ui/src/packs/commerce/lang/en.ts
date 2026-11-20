export type CommerceWords = {
  addProduct: (name: string) => string;
  emptyProducts: string;
  priceChange: (was: string, price: string) => string;
};

export const en = {
  addProduct: (name) => `Add ${name} to basket`,
  emptyProducts: "No products to show",
  priceChange: (was, price) => `${was} → ${price}`,
} satisfies CommerceWords;
