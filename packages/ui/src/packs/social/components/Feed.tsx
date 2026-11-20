import { z } from "zod";
import * as c from "../../../catalog";

// Core first: List/cards cannot show authored excerpts with avatars and an inline like control.
export const meta = {
  id: "Feed",
  status: "draft",
  group: "content",
  purpose: "Browse recent posts shared by several people.",
  pick: "Several community posts to scroll, with authors, short excerpts and reactions. Not one full post (Post), ordinary tappable rows (List), a private journal (Entries), or chat messages (Bubbles).",
  writeHints: [
    "Put the newest post first. Keep the full excerpt text even if it clips on screen. Hide only the attached images with media none; author photos stay.",
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "people",
  realPath: "Posts in a shared app.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"], media: ["thumb", "none"] },
  variantParts: { "media.none": { hides: ["image"] } },
  parts: ["root"],
  items: {
    key: "posts",
    parts: ["root", "name", "photo", "time", "text", "image", "like", "likes", "comments"],
  },
  states: ["filled", "empty", "loading"],
  actions: { items: { root: ["press"], like: ["toggle"] } },
} as const satisfies c.Meta;

const post = z.strictObject({
  name: c.text(24),
  photo: c.photo,
  time: c.text(12),
  text: c.text(280),
  image: c.photo.optional(),
  likes: z.int().min(0).max(999999),
  comments: z.int().min(0).max(999999),
  liked: z.boolean(),
  goto: c.screenId,
});

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    posts: z.array(post).min(1).max(6),
  })
  .overwrite((value) => ({
    ...value,
    posts: value.media === "none" ? value.posts.map((row) => ({ ...row, image: undefined })) : value.posts,
  }));

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const { placeholderDetail, placeholderValue } = c.wordsFor(lang);
  const seed = { photo: "lib:people", time: placeholderValue, likes: 0, comments: 0, liked: false };
  const posts = c.itemsOf(cast, 3).map((item, index) => ({
    ...seed,
    name: c.titleOf(item, 24, thing) || c.placeholderTitle(index, lang),
    text: c.detailOf(item, 280, thing) || placeholderDetail,
    goto: c.screenId.safeParse(item.id).data ?? "post",
  }));
  return {
    posts: posts.length
      ? posts
      : [{ ...seed, name: c.placeholderTitle(0, lang), text: placeholderDetail, goto: "post" }],
  };
}

// prettier-ignore
export const examples = [
  { posts: [
    { name: "Maya", photo: "lib:people", time: "5 min ago", text: "My fern finally unfurled a new frond. Moving it away from the vent made all the difference.", image: "lib:fern", likes: 7, comments: 2, liked: false, goto: "fern_post" },
    { name: "Sam", photo: "lib:people", time: "1 hr ago", text: "Two basil cuttings are rooted and ready to swap.", likes: 3, comments: 1, liked: true, goto: "basil_post" },
  ] },
  { density: "compact", surface: "outlined", media: "none", posts: [
    { name: "Anna", photo: "lib:people", time: "Just now", text: "Clover made a new friend on the riverside walk.", image: "lib:dog", likes: 4, comments: 0, liked: false, goto: "river_post" },
    { name: "Ben", photo: "lib:people", time: "Yesterday", text: "The south gate is open again for morning walks.", likes: 6, comments: 1, liked: true, goto: "gate_post" },
  ] },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Feed");
export const probes = [
  choose(
    "Show several people’s newest community updates to scroll. Each has their avatar, a text excerpt, likes and a link to open the full discussion.",
  ),
  choose(
    "Show my watering supplies as three ordinary tappable rows with names and chevrons, no authors or reactions.",
    "List",
  ),
  write(
    "Show two recent posts with links: Maya offered fern cuttings five minutes ago with seven likes, and Sam offered basil an hour ago with three likes.",
  ),
  {
    ...write(
      "List Maya’s and Sam’s latest plant swap posts with their author avatars and excerpts, but hide attached post pictures.",
    ),
    variant: { axis: "media", value: "none" },
  },
  read("Like Maya’s update about her new fern frond.", { address: "f1/r1/like", action: "toggle" }),
] satisfies c.Probe[];
