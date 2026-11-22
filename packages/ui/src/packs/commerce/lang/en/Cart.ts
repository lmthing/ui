import type { CommerceWords } from "..";

export const words = {
  cart: {
    empty: "Your basket is empty",
    promo: "Promo code",
    subtotal: "Subtotal",
    delivery: "Delivery",
    deliveryReading: "delivery",
    total: "Total",
    quantity: "Quantity",
    unitPrice: (price) => `${price} each`,
    remove: (name) => `Remove ${name}`,
  },
} satisfies Pick<CommerceWords, "cart">;
