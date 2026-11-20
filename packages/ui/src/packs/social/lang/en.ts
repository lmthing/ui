import type { LDMLPluralRule } from "../../../catalog";

type CountCopy = { before?: string; after?: string };

export type SocialWords = {
  feed: {
    likes: (form: LDMLPluralRule) => CountCopy;
    comments: (form: LDMLPluralRule) => CountCopy;
    countSeparator: string;
    reaction: (author: string, liked: boolean) => string;
    open: (author: string) => string;
    image: string;
    skeleton: { author: string; time: string; excerpt: string; likes: string; comments: string };
  };
};

export const en = {
  feed: {
    likes: (form) => ({ after: form === "one" ? " like" : " likes" }),
    comments: (form) => ({ after: form === "one" ? " comment" : " comments" }),
    countSeparator: " · ",
    reaction: (author, liked) => (liked ? `Unlike ${author}’s post` : `Like ${author}’s post`),
    open: (author) => `Open ${author}’s post`,
    image: "Post photo",
    skeleton: {
      author: "Author name",
      time: "A moment ago",
      excerpt: "An excerpt from a recent update with room for a second line.",
      likes: "Likes",
      comments: "Comments",
    },
  },
} satisfies SocialWords;
