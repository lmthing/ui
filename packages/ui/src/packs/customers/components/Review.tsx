import { z } from "zod";
import {
  detailOf,
  isoDate,
  itemsOf,
  placeholderDetail,
  placeholderTitle,
  probesFor,
  text,
  thingOf,
  titleOf,
  type CastLike,
  type Meta,
  type Probe,
} from "../../../catalog";

// Core first: Scale/stars records one person's rating, not client reviews, replies or an aggregate breakdown.
export const meta = {
  id: "Review",
  status: "draft",
  group: "content",
  purpose: "See clients' ratings and words, their breakdown and the business's replies.",
  pick: "Business client feedback as average/count/five-bar summary or authored reviews and replies. Not logging one's own feeling or rating (Scale) or community comments (Comments).",
  writeHints: [
    'style: "summary" needs average, count and exactly five bars. style: "list" needs one to five reviews. Unused fields may be omitted or null.',
    "Each review needs stars 1–5, name, date and text, with an optional business reply.",
  ],
  region: "body",
  weight: 2,
  tier: "people",
  realPath: "Reviews left by clients in a shared app.",
  items: { key: "reviews", parts: ["root", "stars", "name", "date", "text", "reply"] },
  parts: ["root", "average", "count", "bars"],
  states: ["filled", "empty"],
  actions: { items: { reply: ["press"] }, when: { reply: { style: "list" } } },
} as const satisfies Meta;
export const props = z
  .strictObject({
    style: z.enum(["summary", "list"]).default("summary"),
    average: z.number().min(0).max(5).optional(),
    count: z.int().min(0).optional(),
    bars: z.array(z.number().min(0)).min(5).max(5).optional(),
    reviews: z
      .array(
        z.strictObject({
          stars: z.int().min(1).max(5),
          name: text(24),
          date: isoDate,
          text: text(240),
          reply: text(160).optional(),
        }),
      )
      .min(1)
      .max(5)
      .optional(),
  })
  .refine(
    ({ style, average, count, bars, reviews }) =>
      style === "summary"
        ? average !== undefined && count !== undefined && bars !== undefined
        : reviews !== undefined,
    { message: "Supply the active style's fields" },
  );
export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  const item = itemsOf(cast, 1)[0],
    thing = thingOf(cast);
  return {
    average: 0,
    count: 0,
    bars: [0, 0, 0, 0, 0],
    reviews: [
      {
        stars: 1,
        name: (item && titleOf(item, 24, thing)) || placeholderTitle(0),
        date: "2026-11-18",
        text: (item && detailOf(item, 240, thing)) || placeholderDetail,
      },
    ],
  };
}
export const examples = [
  { style: "summary", average: 4.5, count: 4, bars: [0, 0, 0, 2, 2] },
  {
    style: "list",
    reviews: [
      {
        stars: 5,
        name: "Ben Carter",
        date: "2026-11-18",
        text: "Clover and Pip come home happy after every walk.",
        reply: "Thank you, Ben. They are a lovely pair.",
      },
      { stars: 4, name: "Mia Jones", date: "2026-11-17", text: "Reliable pickups and clear updates." },
    ],
  },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("Review");
export const probes = [
  choose("Show what clients said about my business, with their star ratings, dates and my replies"),
  choose("Let me log how I feel today on a five-step mood scale", "Scale"),
  write(
    "List two client reviews: Ben Carter gave five stars on 2026-11-18 and said Great walks; Mia Jones gave four on 2026-11-17 and said Reliable pickups",
  ),
  read("Reply to Ben's review", { address: "r1/r1/reply", action: "press" }, 1),
] satisfies Probe[];
