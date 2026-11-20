import { z } from "zod";
import * as c from "../../../catalog";

// Core first: People/roster cannot distinguish seen updates from unseen ones or add a story.
export const meta = {
  id: "Stories",
  status: "draft",
  group: "content",
  purpose: "Tap through people’s short-lived updates and add one of your own.",
  pick: "Short-lived stories from people, opened from seen or unseen avatar rings, with an optional add button first. Not a member roster (People) or a photo collection (Gallery).",
  writeHints: [
    "mine shows the person's own add entry first. Each person in people is an existing story, with a goto link and seen flag.",
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "people",
  partTiers: { add: "ok" },
  realPath: "Stories in a shared app disappear after a day; adding one opens the camera.",
  variants: { density: ["comfortable", "compact"], surface: ["plain", "card"] },
  parts: ["root", "add"],
  items: { key: "people", parts: ["root", "photo", "name"] },
  states: ["filled", "empty"],
  actions: { parts: { add: ["press"] }, items: { root: ["press"] }, when: { add: { mine: true } } },
  emptyActions: ["add.press"],
} as const satisfies c.Meta;

export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  people: z
    .array(
      z.strictObject({
        name: c.text(12),
        photo: c.photo,
        seen: z.boolean(),
        goto: c.screenId,
      }),
    )
    .min(1)
    .max(10),
  mine: z.boolean(),
});

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const people = c.itemsOf(cast, 3).map((item, index) => ({
    name: c.titleOf(item, 12, thing) || c.clip(c.placeholderTitle(index, lang), 12),
    photo: "lib:people",
    seen: false,
    goto: c.screenId.safeParse(item.id).data ?? "story",
  }));
  return {
    people: people.length
      ? people
      : [{ name: c.clip(c.placeholderTitle(0, lang), 12), photo: "lib:people", seen: false, goto: "story" }],
    mine: false,
  };
}

// prettier-ignore
export const examples = [
  { mine: true, people: [
    { name: "Maya", photo: "lib:people", seen: false, goto: "fern_story" },
    { name: "Sam", photo: "lib:people", seen: true, goto: "basil_story" },
  ] },
  { density: "compact", surface: "card", mine: false, people: [
    { name: "Anna", photo: "lib:people", seen: true, goto: "park_story" },
    { name: "Ben", photo: "lib:people", seen: false, goto: "river_story" },
  ] },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Stories");
export const probes = [
  choose(
    "Show a row of people’s temporary updates that disappear after a day, with rings for new ones and my add button first.",
  ),
  choose(
    "Show an ordinary member roster with names, profile pictures and club roles. No temporary updates.",
    "People",
  ),
  write(
    "Make a row of today’s plant stories: Maya’s fern update is unseen, Sam’s basil update is seen, and I can add my own from the first spot.",
  ),
  read("Open the camera to add my own story.", { address: "s1/add", action: "press" }),
] satisfies c.Probe[];
