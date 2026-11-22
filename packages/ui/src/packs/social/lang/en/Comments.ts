import type { SocialWords } from "..";

export const words = {
  comments: {
    reply: "Reply",
    replyAuthor: (author, parent) => `${author} replying to ${parent}`,
    replyTarget: (author) => `Reply on this row answers ${author}’s comment`,
    more: (author) => `More actions for ${author}’s comment`,
    reaction: (author, liked, count) => `${liked ? "Unlike" : "Like"} ${author}’s comment · ${count}`,
  },
} satisfies Pick<SocialWords, "comments">;
