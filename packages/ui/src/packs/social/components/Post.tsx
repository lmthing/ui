import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { postCountParts, postReading } from "../copy";
import { socialWordsFor } from "../lang";

const imageParts = ["images", "image_2", "image_3", "image_4"] as const;
export const meta = {
  id: "Post",
  status: "ready",
  group: "content",
  purpose: "Read and react to one community post in full.",
  pick: "One community post in full, with author, long text, optional photo carousel and like, comment and share controls. Not several posts (Feed), an article (Article), or one featured thing preview (Card).",
  writeHints: [
    'Write null for unrequested variants, not an explicit default. If only asked to hide attachments, write "density":null, "surface":null, "media":"none". Preserve the images array and the author photo.',
    "Use images for up to four post attachments, not for the author avatar. Use zero for unknown counts and false for an unknown liked state.",
  ],
  region: "body",
  weight: 2,
  tier: "people",
  realPath: "A post in a shared app; more opens the screen's menu.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"], media: ["cover", "none"] },
  variantParts: { "media.none": { hides: imageParts } },
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
  ],
  states: ["filled", "loading"],
  actions: { parts: { like: ["toggle"], comment: ["press"], share: ["press"], more: ["press"] } },
  live: { derive: () => ({ more: { goto: "sheet" } }) },
  read: postReading,
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
  { name: "Maya", photo: "lib:people_maya", time: "5 min ago", text: "My fern finally unfurled a new frond. It had been drying out by the window vent, so I moved it onto the bathroom shelf. The new frond is still pale green and already as long as my hand.", images: ["lib:fern", "lib:plants"], likes: 7, comments: 2, liked: false },
  { name: "Anna", photo: "lib:people_anna", time: "Yesterday", text: "Clover tried the riverside loop for the first time. We went slowly past the ducks and stopped for water at the bridge. I’d take this route again on a quiet morning.", images: ["lib:dog"], likes: 4, comments: 1, liked: true },
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

type PostProps = c.Props<typeof props, typeof meta>;
type Finish = { density: c.ThemeDensity; loading: boolean };
// prettier-ignore
function PostIconAction({ part, icon, label, density }: {
  part: "share" | "more"; icon: c.IconName; label: string; density: c.ThemeDensity;
}) {
  const { controller, interactive } = kit.useKit();
  const { testID } = kit.usePart(part, false);
  if (interactive && controller && !controller.canPress(testID))
    return <kit.KitAction part={part} icon={icon} kind="quiet" a11y={label} disabled />;
  const leading = <kit.KitIcon name={icon} part={`${part}_icon`} tone="muted" />;
  return <kit.KitRow part={part} role="button" label={label} inline density={density}
    leadingWidth="avatar" leadingAlign="row" leading={leading}>{null}</kit.KitRow>;
}

// prettier-ignore
function PostHeader({ input, density, loading }: Finish & { input: PostProps }) {
  const { words: { post } } = kit.useWords(socialWordsFor);
  const { name, photo, time } = input;
  return <kit.KitGrid fitLast density={density}>
    <kit.KitContent density={density} leadingAlign="row" lead={loading ?
      <kit.KitSkeleton shape="control" kind="secondary" /> :
      <kit.KitPhoto part="photo" photo={photo} shape="round" label={name} />}>
      {loading ? <kit.KitSkeleton shape="figure" inset="none" density={density}
        content={[["label", name], ["caption", time]]} /> : <>
          <kit.KitText part="name" role="label" lines={1} density={density}>{name}</kit.KitText>
          <kit.KitText part="time" role="caption" tone="muted" lines={1} density={density}>{time}</kit.KitText>
        </>}
    </kit.KitContent>
    {loading ? <kit.KitSkeleton shape="control" kind="quiet" /> :
      <PostIconAction part="more" icon="more" label={post.more} density={density} />}
  </kit.KitGrid>;
}

// prettier-ignore
function PostImages({ images, density, loading }: Finish & Pick<PostProps, "images">) {
  const { lang, words: { post } } = kit.useWords(socialWordsFor);
  if (loading) return <kit.KitSkeleton shape="media" aspect="wide" inset="none" content={[]} density={density} />;
  const cells = images.map((photo, index) =>
    <kit.KitPhoto key={index} part={imageParts[index]!} photo={photo} shape="wide"
      label={post.image(c.numberLine(index + 1, lang), c.numberLine(images.length, lang))} />);
  return cells.length > 1 ? <kit.KitStrip overflow="page" density={density}>{cells}</kit.KitStrip> : cells[0] ?? null;
}

// prettier-ignore
function PostCountAction({ part, count, label, on, density, loading }: Finish & {
  part: "like" | "comment"; count: string; label: string; on?: boolean;
}) {
  const target = loading ? null : part;
  const { words } = kit.useWords();
  const icon = loading ? <kit.KitSkeleton shape="figure" inset="none" density={density} content={[["heading", words.placeholderValue.repeat(2)]]} /> :
    <kit.KitIcon name={part === "like" ? "heart" : "message"} part={`${part}_icon`} tone={on ? "accent" : "muted"} />;
  return <kit.KitRow part={target} role={loading ? "text" : "button"} label={label} inline density={density}>
    <kit.KitContent inset="md" density={density}>
      <kit.KitRow part={null} role={loading ? "text" : "group"} label={label} inline leading={icon} density={density}>
        {loading ? <kit.KitSkeleton shape="figure" inset="none" content={[["number", count, "start", "compact"]]} density={density} /> :
          <kit.KitText part={part === "like" ? "likes" : "comments"} role="number" numberScale="compact"
            tone={on ? "accent" : "muted"} tabular lines={1} density={density}>{count}</kit.KitText>}
      </kit.KitRow>
    </kit.KitContent>
  </kit.KitRow>;
}

// prettier-ignore
function PostReactions({ input, density, loading }: Finish & { input: PostProps }) {
  const { lang, words: { feed, post } } = kit.useWords(socialWordsFor);
  const { testID } = kit.usePart("like", false);
  const liked = kit.useControlValue(testID, input.liked);
  const [likes, comments] = postCountParts(input, lang);
  const like = <PostCountAction part="like" count={likes.count} on={liked}
    label={post.withCount(feed.reaction(input.name, liked), likes.line)} {...{ density, loading }} />;
  const comment = <PostCountAction part="comment" count={comments.count}
    label={post.withCount(post.comment, comments.line)} {...{ density, loading }} />;
  return <kit.KitGrid fitLast density={density}>
    <kit.KitContent density={density} leadingAlign="row" lead={like}>
      <kit.KitContent density={density} leadingAlign="row" lead={comment}>{null}</kit.KitContent>
    </kit.KitContent>
    {loading ? <kit.KitSkeleton shape="control" kind="quiet" /> :
      <PostIconAction part="share" icon="share" label={post.share} density={density} />}
  </kit.KitGrid>;
}

// prettier-ignore
export function Post(input: PostProps) {
  const loading = kit.useComponentState() === "loading";
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const media = kit.useVariant("media", meta.variants.media, input.media);
  const hasImages = media !== "none" && input.images.length > 0;
  const group = hasImages && !loading && input.images.length > 1 ? "content" : "response";
  return <kit.KitCard part="root" padded {...{ density, surface }}>
    <PostHeader {...{ input, density, loading }} />
    {loading ? <kit.KitSkeleton shape="figure" inset="none" density={density} content={[["body", input.text]]} /> :
      <kit.KitText part="text" density={density}>{input.text}</kit.KitText>}
    {hasImages && <PostImages images={input.images} {...{ density, loading }} />}
    <kit.KitContent group={group} density={density}><PostReactions {...{ input, density, loading }} /></kit.KitContent>
  </kit.KitCard>;
}
