import type { SocialWords } from "..";

export const words = {
  poll: {
    voteFor: (label) => `Vote for ${label}`,
    chosen: (label) => `${label} chosen`,
    votes: (form) => (form === "one" ? "vote" : "votes"),
    closes: (date) => `Closes ${date}`,
    share: (label, percent) => `${label} · ${percent}`,
  },
} satisfies Pick<SocialWords, "poll">;
