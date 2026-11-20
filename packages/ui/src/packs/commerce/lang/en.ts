export type CommerceWords = {
  addProduct: (name: string) => string;
  emptyProducts: string;
  priceChange: (was: string, price: string) => string;
  checkout: {
    fulfillment: string;
    payment: string;
    modes: Record<"pickup" | "delivery" | "table", string>;
    methods: Record<"card" | "cash" | "wallet", string>;
    time: string;
    address: string;
    addAddress: string;
    total: string;
    unavailable: string;
    place: string;
    success: string;
  };
};

export const en = {
  addProduct: (name) => `Add ${name} to basket`,
  emptyProducts: "No products to show",
  priceChange: (was, price) => `${was} → ${price}`,
  checkout: {
    fulfillment: "Fulfillment",
    payment: "Payment",
    modes: { pickup: "pickup", delivery: "delivery", table: "table" },
    methods: { card: "card", cash: "cash", wallet: "wallet" },
    time: "Time",
    address: "Delivery address",
    addAddress: "Add delivery address",
    total: "Order total",
    unavailable: "Unavailable",
    place: "Place order",
    success: "Order placed",
  },
} satisfies CommerceWords;
