import type { CommerceWords } from "..";

export const words = {
  addProduct: (name) => `Add ${name} to basket`,
  emptyProducts: "No products to show",
  deals: "Deals",
  claimed: "Claimed",
} satisfies Pick<CommerceWords, "addProduct" | "emptyProducts" | "deals" | "claimed">;
