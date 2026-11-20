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
  post: {
    more: string;
    comment: string;
    share: string;
    image: (position: string, total: string) => string;
    withCount: (action: string, count: string) => string;
  };
  poll: {
    voteFor: (label: string) => string;
    chosen: (label: string) => string;
    votes: (form: LDMLPluralRule) => string;
    closes: (date: string) => string;
    share: (label: string, percent: string) => string;
  };
  stories: {
    add: string;
    own: string;
    empty: string;
    status: (name: string, seen: boolean) => string;
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
  post: {
    more: "More post actions",
    comment: "Comment on this post",
    share: "Share this post",
    image: (position, total) => `Post photo ${position} of ${total}`,
    withCount: (action, count) => `${action} · ${count}`,
  },
  poll: {
    voteFor: (label) => `Vote for ${label}`,
    chosen: (label) => `${label} chosen`,
    votes: (form) => (form === "one" ? "vote" : "votes"),
    closes: (date) => `Closes ${date}`,
    share: (label, percent) => `${label} · ${percent}`,
  },
  stories: {
    add: "Add your story",
    own: "Your story",
    empty: "No stories yet",
    status: (name, seen) => (seen ? `${name}: seen story` : `${name}: new story`),
  },
} satisfies SocialWords;
