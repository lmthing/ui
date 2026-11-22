import type { CommerceWords } from "..";

export const words = {
  priceChange: (was, price) => `${was} → ${price}`,
  receiptSeparator: " · ",
} satisfies Pick<CommerceWords, "priceChange" | "receiptSeparator">;
