import type { CommerceWords } from "..";

export const words = {
  orderNumber: (number) => `Order #${number}`,
  orderMode: { pickup: "Pickup", delivery: "Delivery", table: "At table" },
  orderTotal: "Total",
  reorder: "Reorder",
} satisfies Pick<CommerceWords, "orderNumber" | "orderMode" | "orderTotal" | "reorder">;
