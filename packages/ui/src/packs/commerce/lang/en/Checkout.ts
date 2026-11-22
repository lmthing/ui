import type { CommerceWords } from "..";

export const words = {
  checkout: {
    fulfillment: "Fulfillment",
    payment: "Payment",
    modes: { pickup: "Pickup", delivery: "Delivery", table: "Table" },
    methods: { card: "Card", cash: "Cash", wallet: "Wallet" },
    time: "Time",
    address: "Delivery address",
    addAddress: "Add delivery address",
    total: "Order total",
    unavailable: "Unavailable",
    place: "Place order",
    success: "Order placed",
  },
} satisfies Pick<CommerceWords, "checkout">;
