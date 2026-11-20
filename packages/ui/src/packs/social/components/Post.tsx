import { z } from "zod";
import * as c from "../../../catalog";

// Core first: Card/feature cannot show a full authored post with a carousel and a reaction bar.
export const meta = {
  id: "Post",
  status: "draft",
  group: "content",
  purpose: "Read and react to one community post in full.",
  pick: "One community post in full, with author, long text, optional photo carousel and like, comment and share controls. Not several posts (Feed), an article (Article), or one featured thing preview (Card).",
  writeHints: [
    "Use images for up to four post attachments, not for the author photo. Keep the images in the data when asked to hide their display.",
  ],
  region: "body",
  weight: 2,
  tier: "people",
  realPath: "A post in a shared app; more opens the screen's menu.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"], media: ["cover", "none"] },
  variantParts: { "media.none": { hides: ["images"] } },
  parts: [
    "root",
    "name",
    "photo",
    "time",
    "text",
    "images",
    "like",
    "likes",
    "comment",
    "comments",
    "share",
    "more",
  ],
  states: ["filled", "loading"],
  actions: { parts: { like: ["toggle"], comment: ["press"], share: ["press"], more: ["press"] } },
} as const satisfies c.Meta;

export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  name: c.text(24),
  photo: c.photo,
  time: c.text(12),
  text: c.text(1000),
  images: z.array(c.photo).min(0).max(4),
  likes: z.int().min(0).max(999999),
  comments: z.int().min(0).max(999999),
  liked: z.boolean(),
});

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const item = c.itemsOf(cast, 1)[0];
  const { placeholderDetail, placeholderValue } = c.wordsFor(lang);
  return {
    name: (item && c.titleOf(item, 24, thing)) || c.placeholderTitle(0, lang),
    photo: "lib:people",
    time: placeholderValue,
    text: (item && c.detailOf(item, 1000, thing)) || placeholderDetail,
    images: [],
    likes: 0,
    comments: 0,
    liked: false,
  };
}

// prettier-ignore
export const examples = [
  { name: "Maya", photo: "lib:people", time: "5 min ago", text: "My fern finally unfurled a new frond. It had been drying out by the window vent, so I moved it onto the bathroom shelf. These two pictures show how it looked before and after the move.", images: ["lib:fern", "lib:plants"], likes: 7, comments: 2, liked: false },
  { density: "compact", surface: "outlined", media: "none", name: "Anna", photo: "lib:people", time: "Yesterday", text: "Clover tried the riverside loop for the first time. We went slowly past the ducks and stopped for water at the bridge. I’d take this route again on a quiet morning.", images: ["lib:dog"], likes: 4, comments: 1, liked: true },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Post");
export const probes = [
  choose(
    "Open one member’s shared update in full with their avatar, all the text, swipeable photos, and buttons to like, comment and share.",
  ),
  choose(
    "Give the winning plant one featured preview with a photo, a title, a short summary and a link to its details.",
    "Card",
  ),
  write(
    "Write Maya’s full community post about the fern’s new frond. Include her avatar, two fern photos, seven likes and two comments.",
  ),
  {
    ...write(
      "Show Maya’s full fern post, keep the two attached photos in its data but hide the attachments on screen. Keep the author avatar.",
    ),
    variant: { axis: "media", value: "none" },
  },
  read("Open the menu on Maya’s post.", { address: "p1/more", action: "press" }),
] satisfies c.Probe[];
