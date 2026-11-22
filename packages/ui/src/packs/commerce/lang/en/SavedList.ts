import type { CommerceWords } from "..";

export const words = {
  savedList: {
    move: "To basket",
    readActions:
      "To move a product into the basket, press its /move action. A press on the row itself opens the product page.",
    remove: (name) => `Remove ${name} from saved items`,
    claim: "Claimed",
    claimItem: (name) => `Claim ${name}`,
    target: "Target price",
    alert: (name) => `Target price for ${name}`,
    previous: (price) => `Was ${price}`,
    priceDrop: (amount) => `${amount} less`,
    blank: "\u00a0",
    priceGap: "\u00a0\u00a0",
    success: "Saved list updated",
    error: "Could not update saved items",
  },
} satisfies Pick<CommerceWords, "savedList">;
