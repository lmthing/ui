import type { LDMLPluralRule } from "../../../../catalog";
import type { SocialWords } from "..";

export const postOptionWords = {
  quote: "Quoted post",
  alert: (tag: string) => `Alert: ${tag}`,
  radius: (count: string) => `Within ${count} km`,
  tags: (tags: readonly string[]) => tags.join(" · "),
  reposts: (count: string, form: LDMLPluralRule) => `${count} ${form === "one" ? "repost" : "reposts"}`,
  repost: (on: boolean) => (on ? "Undo repost" : "Repost"),
  save: (on: boolean) => (on ? "Remove saved post" : "Save post"),
  voted: { up: "Upvoted", down: "Downvoted" },
  poster: "Video preview",
  play: "Play post video",
  pause: "Pause post video",
  empty: "No posts yet",
};

export const words = {
  post: {
    more: "More post actions",
    comment: "Comment on this post",
    share: "Share this post",
    image: (position, total) => `Post photo ${position} of ${total}`,
    withCount: (action, count) => `${action} · ${count}`,
  },
  postOptions: postOptionWords,
} satisfies Pick<SocialWords, "post" | "postOptions">;
