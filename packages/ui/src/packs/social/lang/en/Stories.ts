import type { SocialWords } from "..";

export const words = {
  stories: {
    add: "Add your story",
    rail: "Stories",
    own: "Your story",
    empty: "No stories yet",
    status: (name, seen) => (seen ? `${name}: seen story` : `${name}: new story`),
  },
} satisfies Pick<SocialWords, "stories">;
