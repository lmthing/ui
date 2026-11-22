import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { feedCountParts, feedReading, postCountParts } from "../copy";
import { socialWordsFor } from "../lang";
import * as social from "../post-options";

// Core first: List/cards cannot show authored excerpts with avatars and an inline like control.
export const meta = {
  id: "Feed",
  status: "ready",
  group: "content",
  purpose: "Browse recent posts shared by several people.",
  pick: "Several community posts to scroll, with authors, short excerpts and reactions. Not one full post (Post), ordinary tappable rows (List), a private journal (Entries), or chat messages (Bubbles).",
  writeHints: [
    'Write surface null unless outlining is explicitly requested. For "hide attached post pictures", write media "none" and keep the author avatars. For a photo grid with the standard spacing, framing and attachments, write "arrange":"grid","density":null,"surface":null,"media":null and use image on each row that has an attached photo.',
    ...social.postOptionHints,
    "Put the newest post first. Keep the full excerpt even if it clips on screen. Each post needs an avatar (use lib:people if unspecified), time, excerpt and destination. Use zero for unknown counts and false for unknown liked state.",
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "people",
  realPath: "Posts in a shared app.",
  variants: {
    density: ["comfortable", "compact"],
    surface: ["card", "outlined"],
    media: ["thumb", "none"],
    arrange: ["rows", "grid"],
  },
  variantParts: { "media.none": { hides: ["image", "video", "video_poster", "video_error"] } },
  parts: ["root", "empty"],
  // prettier-ignore
  items: { key: "posts", parts: [
    "root", "card", "name", "photo", "time", "text", "image", "like", "like_icon", "likes", "comments", ...social.postOptionParts,
  ], media: social.postPlayback, toggles: { repost: "reposted", save: "saved" } },
  states: ["filled", "empty", "loading"],
  actions: {
    items: { root: ["press"], like: ["toggle"], ...social.postOptionActions },
    when: social.postOptionWhen,
  },
  live: {
    derive: (input) => ({
      posts: (input.posts as Record<string, unknown>[]).map((row) => ({
        ...row,
        ...social.postOptionFlags(row, input.media !== "none"),
      })),
    }),
  },
  read: feedReading,
} as const satisfies c.Meta;

const post = z.strictObject({
  ...social.postOptionProps,
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
    posts:
      value.media === "none"
        ? value.posts.map((row) => ({ ...row, image: undefined, video: undefined }))
        : value.posts,
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
  const placeholder = { ...seed, name: c.placeholderTitle(0, lang), text: placeholderDetail, goto: "post" };
  return { posts: posts.length ? posts : [placeholder] };
}

// prettier-ignore
export const examples = [
  { posts: [
    { name: "Maya", photo: "lib:people_maya", time: "5 min ago", text: "A new frond on my fern!", image: "lib:fern", likes: 7, comments: 2, liked: false, goto: "fern_post" },
    { name: "Sam", photo: "lib:people_sam", time: "1 hr ago", text: "Two basil cuttings ready to swap.", likes: 3, comments: 1, liked: true, goto: "basil_post" },
  ] },
  { posts: [
    { name: "Anna", photo: "lib:people_anna", time: "Just now", text: "Clover loved the river walk.", likes: 4, comments: 0, liked: false, goto: "river_post" },
    { name: "Ben", photo: "lib:people_ben", time: "Yesterday", text: "The south gate is open again.", likes: 6, comments: 1, liked: true, goto: "gate_post" },
  ] },
  { arrange: "grid", posts: [
    { name: "Maya", photo: "lib:people_maya", time: "Now", text: "First leaf of spring.", image: "lib:fern", likes: 7, comments: 2, liked: false, goto: "fern_post" },
    { name: "Sam", photo: "lib:people_sam", time: "1 hr ago", text: "Basil on the sill.", image: "lib:basil", likes: 3, comments: 1, liked: false, goto: "basil_post" },
  ] },
  { posts: [{ name: "Anna", photo: "lib:people_anna", time: "Just now", text: "A quieter route for morning walks.", video: "lib:dog", likes: 4, comments: 1, liked: false, goto: "river_post", tags: ["Walks", "Trail news"], radiusKm: 3, alertTag: "Trail closure", quote: "Use the riverside path.", reposts: 7, reposted: false, saved: true, vote: "down" }] },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Feed");
// prettier-ignore
export const probes = [
  choose("Show several people’s newest community updates to scroll. Each has their avatar, a text excerpt, likes and a link to open the full discussion."),
  choose("Show my watering supplies as three ordinary tappable rows with names and chevrons, no authors or reactions.", "List"),
  write("Show two recent posts with links: Maya offered fern cuttings five minutes ago with seven likes, and Sam offered basil an hour ago with three likes."),
  {
    ...write("List Maya’s and Sam’s latest plant swap posts with their author avatars and excerpts, but hide attached post pictures."),
    variant: { axis: "media", value: "none" },
  },
  {
    ...write("Show Maya’s fern post and Sam’s basil post in a two-column profile grid, with an attached photo on each. Keep spacing, framing and attachment treatment at their defaults."),
    variant: { axis: "arrange", value: "grid" },
  },
  {
    ...write("Show Maya’s and Sam’s newest posts with tighter spacing. Leave the layout, framing and attachment treatment at their defaults."),
    variant: { axis: "density", value: "compact" },
  },
  ...social.postOptionProbes("Feed"),
  read("Like Maya’s update about her new fern frond.", { address: "f1/r1/like", action: "toggle" }),
] satisfies c.Probe[];

type FeedProps = c.Props<typeof props, typeof meta>;
type FeedPost = FeedProps["posts"][number];

// The reaction control is a sibling of the post link, so liking never opens the post.
// prettier-ignore
function FeedReactions({ post, density, grid }: { post: FeedPost; density: c.ThemeDensity; grid?: boolean }) {
  const { lang, words: { feed } } = kit.useWords(socialWordsFor);
  const { testID } = kit.usePart("like", false);
  const liked = kit.useControlValue(testID, post.liked);
  const shortCounts = grid ? postCountParts(post, lang) : undefined;
  const [likes, comments] = feedCountParts(post, lang).map(({ part, count, before, after }, index) =>
    <kit.KitText key={part} part={part} role="caption" tone="muted" density={density}>
      {before}<kit.KitText part={null} role="number" numberScale="compact" tabular density={density}>{shortCounts?.[index]?.count ?? count}</kit.KitText>{after}
    </kit.KitText>);
  const reaction = <kit.KitAction part="like" action="toggle" icon="heart" kind={liked ? "secondary" : "quiet"}
    a11y={feed.reaction(post.name, liked)} />;
  if (grid) return <kit.KitGrid fitLast density={density}>
    <kit.KitContent density={density}>{likes}{comments}</kit.KitContent>
    {reaction}
  </kit.KitGrid>;
  return <kit.KitContent group="response" lead={reaction} leadingAlign="row" density={density}>
    <kit.KitRow part={null} label="" inline density={density}>
      <kit.KitContent lead={likes} leadingAlign="row" density={density}>{comments}</kit.KitContent>
    </kit.KitRow>
  </kit.KitContent>;
}

// prettier-ignore
export function Feed(input: FeedProps) {
  const state = kit.useComponentState();
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const media = kit.useVariant("media", meta.variants.media, input.media);
  const arrange = kit.useVariant("arrange", meta.variants.arrange, input.arrange);
  if (state === "empty") return <kit.KitCard part="root" {...{ density, surface }}>
    <kit.KitEmpty part="empty" icon="message" decorativeIcon />
  </kit.KitCard>;
  return <kit.KitCard part="root" style="cards" density={density}>
    <kit.KitGrid list arrange={arrange} listRowGap="cards" density={density}>
      {input.posts.map((source) => {
        const post = media === "none" ? { ...source, image: undefined, video: undefined } : source;
        return <kit.KitRow key={post.id} item={post.id} part={null} inline surface="plain" role="text" label="">
          <kit.KitCard part="card" padded {...{ surface, density }}>
            {arrange === "grid" || postOptionPartsPresent(post) ? <social.FeedRecipe {...{ post, density }} grid={arrange === "grid"} response={<FeedReactions {...{ post, density }} grid={arrange === "grid"} />} /> :
              state === "loading" ? <social.FeedLoading {...{ post, density }} /> : <>
              <social.FeedPreview {...{ post, density }} />
              <FeedReactions {...{ post, density }} />
            </>}
          </kit.KitCard>
        </kit.KitRow>;
      })}
    </kit.KitGrid>
  </kit.KitCard>;
}

function postOptionPartsPresent(post: FeedPost) {
  return Object.keys(social.postOptionProps).some(
    (key) => post[key as keyof typeof social.postOptionProps] !== undefined,
  );
}
