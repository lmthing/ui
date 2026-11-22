import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { postReading } from "../copy";
import { socialWordsFor } from "../lang";
import * as social from "../post-options";

const imageParts = ["images", "image_2", "image_3", "image_4"] as const;
export const meta = {
  id: "Post",
  status: "ready",
  group: "content",
  purpose: "Read and react to one community post in full.",
  pick: "One community post in full, with author, long text, optional photo carousel and like, comment and share controls. Not several posts (Feed), an article (Article), or one featured thing preview (Card).",
  writeHints: [
    'Write null for unrequested variants, not an explicit default. If only asked to hide attachments, write "density":null, "surface":null, "media":"none". Preserve the images array and the author photo.',
    'For a photo grid with standard spacing, framing and attachment treatment, use "arrange":"grid","density":null,"surface":null,"media":null. A grid request does not select a surface.',
    ...social.postOptionHints,
    "Use images for up to four post attachments, not for the author avatar. Use zero for unknown counts and false for an unknown liked state.",
  ],
  region: "body",
  weight: 2,
  tier: "people",
  realPath: "A post in a shared app; more opens the screen's menu.",
  variants: {
    density: ["comfortable", "compact"],
    surface: ["card", "outlined"],
    media: ["cover", "none"],
    arrange: ["rows", "grid"],
  },
  variantParts: { "media.none": { hides: [...imageParts, "video", "video_poster", "video_error"] } },
  parts: [
    "root",
    "name",
    "photo",
    "time",
    "text",
    ...imageParts,
    "like",
    "like_icon",
    "likes",
    "comment",
    "comment_icon",
    "comments",
    "share",
    "share_icon",
    "more",
    "more_icon",
    ...social.postOptionParts,
  ],
  states: ["filled", "loading"],
  actions: {
    parts: {
      like: ["toggle"],
      comment: ["press"],
      share: ["press"],
      more: ["press"],
      ...social.postOptionActions,
    },
    when: social.postOptionWhen,
  },
  media: social.postPlayback,
  live: {
    toggles: { repost: { prop: "reposted", initial: false }, save: { prop: "saved", initial: false } },
    derive: (input) => ({
      hasVideo: input.media !== "none" && typeof input.video === "string",
      ...(input.canRepost ? {} : { reposted: undefined }),
      ...(input.canSave ? {} : { saved: undefined }),
      ...(input.media === "none" ? { video: undefined } : {}),
      more: { goto: "sheet" },
    }),
  },
  read: postReading,
} as const satisfies c.Meta;

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    ...social.postOptionProps,
    name: c.text(24),
    photo: c.photo,
    time: c.text(12),
    text: c.text(1000),
    images: z.array(c.photo).min(0).max(4),
    likes: z.int().min(0).max(999999),
    comments: z.int().min(0).max(999999),
    liked: z.boolean(),
  })
  .overwrite((input) => ({ ...input, ...social.postOptionFlags(input, input.media !== "none") }));

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
  { name: "Maya", photo: "lib:people_maya", time: "5 min ago", text: "My fern finally unfurled a new frond. It had been drying out by the window vent, so I moved it onto the bathroom shelf. The new frond is still pale green and already as long as my hand.", images: ["lib:fern", "lib:plants"], likes: 7, comments: 2, liked: false },
  { name: "Anna", photo: "lib:people_anna", time: "Yesterday", text: "Clover tried the riverside loop for the first time. We went slowly past the ducks and stopped for water at the bridge. I’d take this route again on a quiet morning.", images: ["lib:dog"], likes: 4, comments: 1, liked: true },
  { name: "Maya", photo: "lib:people_maya", time: "5 min ago", text: "A closer look at the leaves from today’s swap.", images: ["lib:fern", "lib:basil"], likes: 7, comments: 2, liked: true, arrange: "grid" },
  { name: "Anna", photo: "lib:people_anna", time: "Yesterday", text: "Take the riverside path while the gate is closed.", images: [], likes: 4, comments: 1, liked: false, video: "lib:dog", reposts: 7, reposted: true, saved: false, quote: "Use the riverside path.", vote: "up", tags: ["Walks", "Trail news"], radiusKm: 3, alertTag: "Trail closure" },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Post");
// prettier-ignore
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
  {
    ...write("Show Maya’s full fern post with two attached photos side by side in a two-column grid, not a carousel. Keep the default spacing, framing and attachment treatment."),
    variant: { axis: "arrange", value: "grid" },
  },
  {
    ...write("Show Maya’s full fern post with tight spacing but keep the normal photo carousel."),
    variant: { axis: "density", value: "compact" },
  },
  ...social.postOptionProbes("Post"),
  read("Open the menu on Maya’s post.", { address: "p1/more", action: "press" }),
] satisfies c.Probe[];

type PostProps = c.Props<typeof props, typeof meta>;
type Finish = { density: c.ThemeDensity; loading: boolean };
// prettier-ignore
function PostImages({ images, density, loading, grid }: Finish & Pick<PostProps, "images"> & { grid: boolean }) {
  const { lang, words: { post } } = kit.useWords(socialWordsFor);
  if (loading && !grid && images.length < 2) return <kit.KitSkeleton shape="media" aspect="wide" inset="none" content={[]} density={density} />;
  const cells = images.map((photo, index) =>
    <kit.KitPhoto key={index} part={loading ? null : imageParts[index]!} photo={photo} shape={grid ? "square" : "wide"} loading={loading}
      label={post.image(c.numberLine(index + 1, lang), c.numberLine(images.length, lang))} />);
  if (cells.length < 2) return cells[0] ?? null;
  const content = grid ? <kit.KitGrid density={density}>{cells}</kit.KitGrid> :
    <kit.KitStrip overflow="page" density={density}>{cells}</kit.KitStrip>;
  return loading ? <kit.KitState loading={content} density={density} /> : content;
}

// prettier-ignore
export function Post(input: PostProps) {
  const loading = kit.useComponentState() === "loading";
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const media = kit.useVariant("media", meta.variants.media, input.media);
  const grid = kit.useVariant("arrange", meta.variants.arrange, input.arrange) === "grid";
  const hasImages = media !== "none" && input.images.length > 0;
  const group = hasImages && input.images.length > 1 ? "content" : "response";
  return <kit.KitCard part="root" padded {...{ density, surface }}>
    <social.PostHeader {...{ input, density, loading }} />
    {loading ? <kit.KitSkeleton shape="figure" inset="none" density={density} content={[["body", input.text]]} /> :
      <kit.KitText part="text" density={density}>{input.text}</kit.KitText>}
    <social.PostDetails value={input} density={density} />
    {hasImages && <PostImages images={input.images} {...{ density, loading, grid }} />}
    {media !== "none" && input.video && <social.PostVideo poster={input.video} density={density} />}
    <kit.KitContent group={group} density={density}><social.PostReactions {...{ input, density, loading }} /></kit.KitContent>
    <social.PostExtrasFooter value={input} density={density} />
  </kit.KitCard>;
}
