import type { SocialWords } from "..";

export const words = {
  post: {
    more: "More post actions",
    comment: "Comment on this post",
    share: "Share this post",
    image: (position, total) => `Post photo ${position} of ${total}`,
    withCount: (action, count) => `${action} · ${count}`,
  },
} satisfies Pick<SocialWords, "post">;
