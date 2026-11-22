import type { CommerceWords } from "..";

export const words = {
  offerExpired: "Offer ended",
  promoEnds: "ends",
  copyPromoCode: (code) => `Copy ${code}`,
} satisfies Pick<CommerceWords, "offerExpired" | "promoEnds" | "copyPromoCode">;
