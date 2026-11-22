import { z } from "zod";
import { photo, text, type WriteProbe } from "../../../catalog";

export const postOptionProps = {
  video: photo.optional(),
  reposts: z.int().min(0).max(999999).optional(),
  reposted: z.boolean().optional(),
  saved: z.boolean().optional(),
  quote: text(160).optional(),
  vote: z.enum(["up", "down"]).optional(),
  tags: z.array(text(18)).min(1).max(3).optional(),
  radiusKm: z.number().min(0.1).max(100).optional(),
  alertTag: text(20).optional(),
};

export const postOptionParts = [
  "video",
  "video_poster",
  "video_error",
  "reposts",
  "repost",
  "save",
  "quote",
  "vote",
  "tags",
  "radius",
  "alert_tag",
] as const;
export const postOptionActions = { video: ["play", "pause"], repost: ["toggle"], save: ["toggle"] } as const;
export const postOptionWhen = {
  video: { hasVideo: true },
  repost: { canRepost: true },
  save: { canSave: true },
} as const;
export const postPlayback = { playback: { video: { video: true } } } as const;

export function postOptionFlags(post: Record<string, unknown>, showMedia: boolean) {
  return {
    hasVideo: showMedia && typeof post.video === "string",
    canRepost: typeof post.reposted === "boolean",
    canSave: typeof post.saved === "boolean",
  };
}

export const postOptionHints = [
  "Use arrange grid for a two-column layout and density compact for tighter spacing. Do not write a style key for either.",
  "Put a video poster reference in video (lib: or local:), not in the media variant. The host supplies playback. Set reposts to the stated count; set reposted and saved only when their state or controls are requested.",
  'For quoted text use quote. For an existing upvote or downvote use vote "up" or "down". Use tags for short topic labels, radiusKm for a stated distance in kilometers, and alertTag for a short neighborhood alert category. Leave unrequested options null.',
] as const;

const optionRequests = [
  ["Attach a playable video with poster reference lib:fern.", { video: "lib:fern" }],
  ["Show that the post has seven reposts.", { reposts: 7 }],
  ["Show that I already reposted it.", { reposted: true }],
  ["Show that I saved it for later.", { saved: true }],
  ['Include the quoted post: "The fern is ready."', { quote: "The fern is ready." }],
  ["Show that I downvoted it.", { vote: "down" }],
  ['Tag it "Plant swap" and "Cuttings", in that order.', { tags: ["Plant swap", "Cuttings"] }],
  ["Show that this neighborhood post covers a radius of 3 kilometers.", { radiusKm: 3 }],
  ['Mark it with the neighborhood alert tag "Trail closure".', { alertTag: "Trail closure" }],
] as const;

export function postOptionProbes(id: "Feed" | "Post"): WriteProbe[] {
  const subject =
    id === "Feed" ? "Make a feed with just Maya’s latest fern update." : "Show Maya’s full fern update.";
  return optionRequests.map(([request, expected]) => ({
    kind: "write",
    expect: id,
    brief: `${subject} ${request}`,
    expectProps: id === "Feed" ? { posts: [expected] } : expected,
  }));
}
