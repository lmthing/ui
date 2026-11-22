import type { LDMLPluralRule } from "../plural";

export const words = {
  reviews: (count: string, form: LDMLPluralRule) => `${count} ${form === "one" ? "review" : "reviews"}`,
  stars: (count: string, form: LDMLPluralRule) => `${count} ${form === "one" ? "star" : "stars"}`,
  reviewLabels: {
    reply: "Reply",
    response: "Business reply",
    verified: "Verified",
    showSpoiler: "Show spoiler",
    hideSpoiler: "Hide spoiler",
    photo: (index: string) => `Review photo ${index}`,
    fit: (value: number) =>
      ["Runs very small", "Runs small", "True to size", "Runs large", "Runs very large"][value - 1]!,
  },
};
