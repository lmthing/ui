export type CommerceWords = {
  addProduct: (name: string) => string;
  priceChange: (was: string, price: string) => string;
};

export const en = {
  addProduct: (name) => `Add ${name} to basket`,
  priceChange: (was, price) => `${was} → ${price}`,
} satisfies CommerceWords;
