import { z } from "zod";
import * as c from "../../../catalog";

// Core first: Note/default cannot show a long structured reading with links to other screens.
export const meta = {
  id: "Article",
  status: "draft",
  group: "content",
  purpose: "Read a long piece with headings, paragraphs, quotes and links.",
  pick: "A long article, guide, or policy with several paragraphs and structured text. Not one short supporting sentence (Note), expandable answers (List), a community post (Post), or terms to sign (Agreement).",
  writeHints: [
    "Body uses headings, paragraphs, lists, quotes, bold, italic and [label](screen:screen_id) links. No HTML or external links.",
    'For body-only reading with no header, set detail "brief". Keep title in the line; reading time is computed.',
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "The text is stored on or bundled with the app.",
  variants: {
    density: ["comfortable", "compact"],
    detail: ["full", "brief"],
  },
  variantParts: { "detail.brief": { hides: ["title", "by", "date", "reading_time", "photo"] } },
  parts: ["root", "title", "by", "date", "reading_time", "photo", "body"],
  items: { key: "links", parts: ["root"] },
  states: ["filled", "loading"],
  actions: { items: { root: ["press"] } },
} as const satisfies c.Meta;

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    title: c.text(80),
    by: c.text(32).optional(),
    date: c.isoDate.optional(),
    photo: c.photo.optional(),
    body: c.text(2000),
  })
  .overwrite((value) => ({
    ...value,
    links: Array.from(
      value.body.matchAll(/(?<![!\\])\[([^\][\n]+)\]\(screen:([a-z][a-z0-9_]{0,63})\)/g),
      ([, title, goto]) => ({ title, goto }),
    ),
  }));

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const [item] = c.itemsOf(cast, 1);
  return {
    title: (item && c.titleOf(item, 80, thing)) || c.placeholderTitle(0, lang),
    body: (item && c.detailOf(item, 2000, thing)) || c.wordsFor(lang).placeholderDetail,
  };
}

export const examples = [
  {
    title: "A fern's first week at home",
    by: "Noor Martin",
    date: "2026-11-08",
    photo: "lib:plants",
    body: "## Pick a spot\nSet the fern by a bright window, out of direct sun. Give its fronds room to unfurl.\n\n> Check the pot before you water.\n\nSee the [fern care schedule](screen:fern_schedule) for a reminder.",
  },
  {
    detail: "brief",
    density: "compact",
    title: "Before the first walk",
    body: "## At the door\nBring the lead, a water bowl, and a spare bag. Let Clover sniff the lead before clipping it on.\n\n- Check the gate latch.\n- Keep the first loop short.\n\nOpen the [park route](screen:park_route) before setting out.",
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Article");
export const probes = [
  choose(
    "Publish a full reading page with a byline, a lead photo, several headings, paragraphs and inline links",
  ),
  choose(
    "Put one short supporting sentence below today's plan: The side gate sticks in wet weather.",
    "Note",
  ),
  write(
    "Write a long reading page called A fern's first week, by Noor Martin, dated 2026-11-08. Use lib:plants, a heading called Pick a spot, two paragraphs about indirect light and a link to fern_schedule.",
  ),
  {
    ...write(
      "Write a long guide titled Before the first walk, with two paragraphs and a heading about the lead. Show only its body, without the title or any reading header.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Follow the fern care schedule link", { address: "a1/r1", action: "press" }),
] satisfies c.Probe[];
