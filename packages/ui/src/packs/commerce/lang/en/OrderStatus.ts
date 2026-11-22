import type { CommerceWords } from "..";

export const words = {
  advanceOrder: (stage) => `Mark as ${stage}`,
  currentOrderStage: (stage) => `Current stage: ${stage}`,
  orderComplete: "Order complete",
  tracking: {
    copy: (id) => `Copy tracking number ${id}`,
    proof: "Delivery proof",
    pickup: (code) => `Pickup code: ${code}`,
    here: "I’m here",
  },
} satisfies Pick<CommerceWords, "advanceOrder" | "currentOrderStage" | "orderComplete" | "tracking">;
