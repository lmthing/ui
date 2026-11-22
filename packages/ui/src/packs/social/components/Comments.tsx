import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { commentLikeCopy, commentReading } from "../copy";
import { socialWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-Comments.generated";

// Core first: Bubbles/default cannot display public post replies nested under a parent comment.
export const meta = {
  id: "Comments",
  status: "ready",
  group: "content",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 3,
  dense: true,
  tier: "people",
  realPath: "Replies in a shared app; new replies come from a reply Composer below.",
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["time"] } },
  parts: ["root", "empty"],
  items: {
    key: "comments",
    parts: [
      "root",
      "name",
      "photo",
      "time",
      "text",
      "like",
      "like_icon",
      "likes",
      "reply",
      "reply_label",
      "more",
      "more_icon",
    ],
  },
  states: ["filled", "empty"],
  actions: { items: { like: ["toggle"], reply: ["press"], more: ["press"] } },
  live: { derive: commentControls },
  read: commentReading,
} as const satisfies c.Meta;

const comment = z.strictObject({
  name: c.text(24),
  photo: c.photo,
  time: c.text(12),
  text: c.text(240),
  likes: z.int().min(0).max(999999),
  reply: z.boolean(),
});

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    comments: z.array(comment).min(1).max(6),
  })
  .refine(({ comments }) => !comments[0]?.reply, { path: ["comments", 0, "reply"] });

function commentControls(input: c.Values): c.Values {
  const { comments, detail } = input as z.output<typeof props>;
  return {
    comments: comments.map((row) => ({
      ...row,
      like: { liked: false },
      ...(detail === "brief" ? { time: undefined } : {}),
    })),
  };
}

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const { placeholderDetail, placeholderValue } = c.wordsFor(lang);
  const seed = { photo: "lib:people", time: placeholderValue, likes: 0, reply: false };
  const comments = c.itemsOf(cast, 3).map((item, index) => ({
    ...seed,
    name: c.titleOf(item, 24, thing) || c.placeholderTitle(index, lang),
    text: c.detailOf(item, 240, thing) || placeholderDetail,
  }));
  return {
    comments: comments.length
      ? comments
      : [{ ...seed, name: c.placeholderTitle(0, lang), text: placeholderDetail }],
  };
}

// prettier-ignore
export const examples = [
  { comments: [
    { name: "Sam", photo: "lib:people_sam", time: "4 min ago", text: "How bright is the bathroom shelf?", likes: 2, reply: false },
    { name: "Maya", photo: "lib:people_maya", time: "Just now", text: "It gets indirect light from an east window.", likes: 1, reply: true },
  ] },
  { detail: "brief", comments: [
    { name: "Ben", photo: "lib:people_ben", time: "1 hr ago", text: "What time do you usually pass the bridge with Clover?", likes: 3, reply: false },
    { name: "Anna", photo: "lib:people_anna", time: "15 min ago", text: "Around eight, before the cycle path gets busy.", likes: 0, reply: true },
  ] },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Comments");
export const probes = [
  choose(
    "Under a public post, show everyone’s replies with avatars and likes. Indent an answer beneath the comment it responds to.",
  ),
  choose(
    "Show my private back-and-forth conversation with Anna, with incoming and outgoing messages on opposite sides.",
    "Bubbles",
  ),
  write(
    "Below the fern post, show Sam’s comment asking about light, then Maya’s indented answer that the shelf gets indirect light.",
  ),
  {
    ...write(
      "Put Sam’s comment and Maya’s indented answer beneath the fern post. Hide their timestamps without hiding their names or messages.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Reply to Sam’s question about how bright the shelf is.", { address: "c1/r1/reply", action: "press" }),
] satisfies c.Probe[];

type CommentsProps = c.Props<typeof props, typeof meta>;
type CommentRow = CommentsProps["comments"][number];
type Finish = { density: c.ThemeDensity };

// prettier-ignore
function CommentMenu({ label, density }: Finish & { label: string }) {
  const icon = <kit.KitIcon name="more" part="more_icon" tone="muted" />;
  return <kit.KitRow part="more" role="button" label={label} inline density={density}
    leadingWidth="avatar" leadingAlign="row" leading={icon}>{null}</kit.KitRow>;
}

// prettier-ignore
function CommentActions({ row, density }: Finish & { row: CommentRow }) {
  const { lang, words: { comments } } = kit.useWords(socialWordsFor);
  const liked = kit.useControlValue(kit.usePart("like", false).testID, false);
  const { count, line } = commentLikeCopy(row.likes, lang);
  const label = comments.reaction(row.name, liked, line);
  const icon = <kit.KitIcon name="heart" part="like_icon" tone={liked ? "accent" : "muted"} />;
  const like = <kit.KitRow part="like" role="button" label={label} inline density={density}>
    <kit.KitContent inset="md" density={density}>
      <kit.KitRow part={null} role="group" label={label} inline leading={icon} density={density}>
        <kit.KitText part="likes" role="number" numberScale="compact" tone={liked ? "accent" : "muted"}
          tabular lines={1} density={density}>{count}</kit.KitText>
      </kit.KitRow>
    </kit.KitContent>
  </kit.KitRow>;
  return <kit.KitContent density={density} leadingAlign="row" lead={like}>
    <kit.KitAction part="reply" label={comments.reply} kind="quiet" />
  </kit.KitContent>;
}

// prettier-ignore
function Comment({ row, density, parent, detail }: Finish & {
  row: CommentRow; parent: string | undefined; detail: CommentsProps["detail"];
}) {
  const { words: { comments } } = kit.useWords(socialWordsFor);
  const label = parent ? comments.replyAuthor(row.name, parent) : row.name;
  const avatar = <kit.KitPhoto part="photo" photo={row.photo} label={row.name} shape="round" />;
  return <kit.KitRow item={row.id} label={label} inline indent={row.reply ? 1 : 0} density={density}>
    <kit.KitContent density={density}>
      <kit.KitContent lead={avatar} leadingAlign="row" density={density}>
        <kit.KitText part="name" role="label" lines={1} density={density}>{row.name}</kit.KitText>
        {detail !== "brief" && <kit.KitText part="time" role="caption" tone="muted" lines={1} density={density}>{row.time}</kit.KitText>}
        <kit.KitText part="text" density={density}>{row.text}</kit.KitText>
      </kit.KitContent>
      <kit.KitGrid fitLast density={density}>
        <CommentActions {...{ row, density }} />
        <CommentMenu label={comments.more(row.name)} density={density} />
      </kit.KitGrid>
    </kit.KitContent>
  </kit.KitRow>;
}

// prettier-ignore
export function Comments(input: CommentsProps) {
  const state = kit.useComponentState();
  const density = kit.useKit().density;
  const surface = "card";
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  let parent: string | undefined;
  return <kit.KitCard part="root" padded {...{ density, surface }}>
    {state === "empty" ? <kit.KitEmpty part="empty" icon="message" decorativeIcon /> :
      input.comments.map((row) => {
        if (!row.reply) parent = row.name;
        return <Comment key={row.id} parent={row.reply ? parent : undefined} {...{ row, density, detail }} />;
      })}
  </kit.KitCard>;
}
