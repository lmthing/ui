import type { LDMLPluralRule } from "../../../catalog";

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
