import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { feedCountParts, feedReading } from "../copy";
import { socialWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-Feed.generated";

// Core first: List/cards cannot show authored excerpts with avatars and an inline like control.
export const meta = {
  id: "Feed",
  status: "ready",
  group: "content",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 3,
  dense: true,
  tier: "people",
  realPath: "Posts in a shared app.",
  variants: { media: ["thumb", "none"] },
  variantParts: { "media.none": { hides: ["image"] } },
  parts: ["root", "empty"],
  // prettier-ignore
  items: { key: "posts", parts: [
    "root", "card", "name", "photo", "time", "text", "image", "like", "like_icon", "likes", "comments",
  ] },
  states: ["filled", "empty", "loading"],
  actions: { items: { root: ["press"], like: ["toggle"] } },
  read: feedReading,
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
  const placeholder = { ...seed, name: c.placeholderTitle(0, lang), text: placeholderDetail, goto: "post" };
  return { posts: posts.length ? posts : [placeholder] };
}

export const examples = [
  {
    posts: [
      {
        name: "Maya",
        photo: "lib:people_maya",
        time: "5 min ago",
        text: "A new frond on my fern!",
        image: "lib:fern",
        likes: 7,
        comments: 2,
        liked: false,
        goto: "fern_post",
      },
      {
        name: "Sam",
        photo: "lib:people_sam",
        time: "1 hr ago",
        text: "Two basil cuttings ready to swap.",
        likes: 3,
        comments: 1,
        liked: true,
        goto: "basil_post",
      },
    ],
  },
  {
    posts: [
      {
        name: "Anna",
        photo: "lib:people_anna",
        time: "Just now",
        text: "Clover loved the river walk.",
        likes: 4,
        comments: 0,
        liked: false,
        goto: "river_post",
      },
      {
        name: "Ben",
        photo: "lib:people_ben",
        time: "Yesterday",
        text: "The south gate is open again.",
        likes: 6,
        comments: 1,
        liked: true,
        goto: "gate_post",
      },
    ],
  },
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

type FeedProps = c.Props<typeof props, typeof meta>;
type FeedPost = FeedProps["posts"][number];

// The reaction control is a sibling of the post link, so liking never opens the post.
function FeedReactions({ post, density }: { post: FeedPost; density: c.ThemeDensity }) {
  const {
    lang,
    words: { feed },
  } = kit.useWords(socialWordsFor);
  const { testID } = kit.usePart("like", false);
  const liked = kit.useControlValue(testID, post.liked);
  const [likes, comments] = feedCountParts(post, lang).map(({ part, count, before, after }) => (
    <kit.KitText key={part} part={part} role="caption" tone="muted" density={density}>
      {before}
      <kit.KitText part={null} role="number" numberScale="compact" tabular density={density}>
        {count}
      </kit.KitText>
      {after}
    </kit.KitText>
  ));
  const reaction = (
    <kit.KitAction
      part="like"
      action="toggle"
      icon="heart"
      kind={liked ? "secondary" : "quiet"}
      a11y={feed.reaction(post.name, liked)}
    />
  );
  return (
    <kit.KitContent group="response" lead={reaction} leadingAlign="row" density={density}>
      <kit.KitRow part={null} label="" inline density={density}>
        <kit.KitContent lead={likes} leadingAlign="row" density={density}>
          {comments}
        </kit.KitContent>
      </kit.KitRow>
    </kit.KitContent>
  );
}

function FeedPreview({ post, density }: { post: FeedPost; density: c.ThemeDensity }) {
  const {
    words: { feed },
  } = kit.useWords(socialWordsFor);
  const { name, photo, time, text, image, goto } = post;
  const excerpt = (
    <kit.KitText part="text" lines={3} density={density}>
      {text}
    </kit.KitText>
  );
  return (
    <kit.KitRow part="root" inline surface="plain" label={feed.open(name)} goto={goto} density={density}>
      <kit.KitContent density={density}>
        <kit.KitRow
          part={null}
          inline
          label=""
          lineRole="label"
          density={density}
          trailing={<kit.KitIcon name="chevron_right" tone="muted" decorative />}
        >
          <kit.KitContent
            density={density}
            leadingAlign="row"
            lead={<kit.KitPhoto photo={photo} part="photo" shape="round" label={name} />}
          >
            <kit.KitText part="name" role="label" tone="muted" lines={1} density={density}>
              {name}
            </kit.KitText>
            <kit.KitText part="time" role="caption" tone="muted" lines={1} density={density}>
              {time}
            </kit.KitText>
          </kit.KitContent>
        </kit.KitRow>
        <kit.KitContent group="response" density={density}>
          {image ? (
            <kit.KitGrid fitLast density={density}>
              {excerpt}
              <kit.KitContent
                density={density}
                leadingAlign="row"
                lead={<kit.KitPhoto part="image" photo={image} shape="thumb" label={feed.image} />}
              >
                {null}
              </kit.KitContent>
            </kit.KitGrid>
          ) : (
            excerpt
          )}
        </kit.KitContent>
      </kit.KitContent>
    </kit.KitRow>
  );
}

type FeedSkeleton = ReturnType<typeof socialWordsFor>["feed"]["skeleton"];

function FeedLoadingReactions(skeleton: FeedSkeleton, hasImage: boolean, density: c.ThemeDensity) {
  return (
    <kit.KitContent group={hasImage ? "response" : "content"} density={density}>
      <kit.KitContent
        group="response"
        density={density}
        leadingAlign="row"
        lead={<kit.KitSkeleton shape="control" kind="secondary" />}
      >
        <kit.KitRow part={null} label="" inline density={density}>
          <kit.KitContent
            density={density}
            leadingAlign="row"
            lead={
              <kit.KitSkeleton
                shape="figure"
                inset="none"
                density={density}
                content={[["caption", skeleton.likes]]}
              />
            }
          >
            <kit.KitSkeleton
              shape="figure"
              inset="none"
              density={density}
              content={[["caption", skeleton.comments]]}
            />
          </kit.KitContent>
        </kit.KitRow>
      </kit.KitContent>
    </kit.KitContent>
  );
}

function FeedLoading({ post, density }: { post: FeedPost; density: c.ThemeDensity }) {
  const {
    words: { feed },
  } = kit.useWords(socialWordsFor);
  const skeleton = feed.skeleton;
  const excerpt = (
    <kit.KitSkeleton shape="figure" inset="none" density={density} content={[["body", skeleton.excerpt]]} />
  );
  return (
    <>
      <kit.KitContent
        density={density}
        leadingAlign="row"
        lead={<kit.KitSkeleton shape="control" kind="secondary" />}
      >
        <kit.KitSkeleton
          shape="figure"
          inset="none"
          density={density}
          content={[
            ["label", skeleton.author],
            ["caption", skeleton.time],
          ]}
        />
      </kit.KitContent>
      <kit.KitContent group="response" density={density}>
        {post.image ? (
          <kit.KitContent group="response" density={density}>
            <kit.KitGrid fitLast density={density}>
              {excerpt}
              <kit.KitSkeleton shape="figure" lead="box" inset="none" content={[]} density={density} />
            </kit.KitGrid>
          </kit.KitContent>
        ) : (
          excerpt
        )}
      </kit.KitContent>
      {FeedLoadingReactions(skeleton, Boolean(post.image), density)}
    </>
  );
}

export function Feed(input: FeedProps) {
  const state = kit.useComponentState();
  const density = kit.useKit().density;
  const surface = "card";
  const media = kit.useVariant("media", meta.variants.media, input.media);
  if (state === "empty")
    return (
      <kit.KitCard part="root" {...{ density, surface }}>
        <kit.KitEmpty part="empty" icon="message" decorativeIcon />
      </kit.KitCard>
    );
  return (
    <kit.KitCard part="root" style="cards" density={density}>
      <kit.KitGrid list arrange="rows" listRowGap="cards" density={density}>
        {input.posts.map((source) => {
          const post = media === "none" ? { ...source, image: undefined } : source;
          return (
            <kit.KitRow key={post.id} item={post.id} part={null} inline surface="plain" role="text" label="">
              <kit.KitCard part="card" padded {...{ surface, density }}>
                {state === "loading" ? (
                  <FeedLoading {...{ post, density }} />
                ) : (
                  <>
                    <FeedPreview {...{ post, density }} />
                    <FeedReactions {...{ post, density }} />
                  </>
                )}
              </kit.KitCard>
            </kit.KitRow>
          );
        })}
      </kit.KitGrid>
    </kit.KitCard>
  );
}
