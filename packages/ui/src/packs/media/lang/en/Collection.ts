import type { LDMLPluralRule } from "../../../../catalog";

export const words = {
  collection: {
    playAll: "Play all",
    playBook: "Play audiobook",
    follow: "Follow",
    following: "Following",
    count: (form: LDMLPluralRule, kind: "episode" | "track" | "chapter") =>
      form === "one" ? kind : `${kind}s`,
    hours: "h",
    minutes: "min",
    seconds: "sec",
    summary: (count: string, duration: string) => `${count} · ${duration}`,
    rating: (limit: string) => `out of ${limit}`,
    ratingCount: (form: LDMLPluralRule) => (form === "one" ? "rating" : "ratings"),
  },
};
