import { z } from "zod";
import * as c from "../../../catalog";

// Core first: Bubbles/default cannot display public post replies nested under a parent comment.
export const meta = {
  id: "Comments",
  status: "draft",
  group: "content",
  purpose: "Read and respond to replies under a shared post.",
  pick: "Public replies beneath a post, with author avatars, like and reply controls, and one level of indentation. Not a two-person private conversation (Bubbles) or a business review (Review).",
  writeHints: [
    "The first comment must have reply false. A reply true is indented under the preceding top-level comment.",
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "people",
  realPath: "Replies in a shared app; new replies come from a reply Composer below.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["time"] } },
  parts: ["root"],
  items: {
    key: "comments",
    parts: ["root", "name", "photo", "time", "text", "like", "likes", "reply", "more"],
  },
  states: ["filled", "empty"],
  actions: { items: { like: ["toggle"], reply: ["press"], more: ["press"] } },
  live: { derive: commentControls },
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
    { name: "Sam", photo: "lib:people", time: "4 min ago", text: "How bright is the bathroom shelf?", likes: 2, reply: false },
    { name: "Maya", photo: "lib:people", time: "Just now", text: "It gets indirect light from an east window.", likes: 1, reply: true },
  ] },
  { density: "compact", surface: "outlined", detail: "brief", comments: [
    { name: "Ben", photo: "lib:people", time: "1 hr ago", text: "What time do you usually pass the bridge with Clover?", likes: 3, reply: false },
    { name: "Anna", photo: "lib:people", time: "15 min ago", text: "Around eight, before the cycle path gets busy.", likes: 0, reply: true },
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
