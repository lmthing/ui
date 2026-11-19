import { customersWordsFor } from "../lang";
import {
  useWords,
  KitAction,
  KitCard,
  KitContent,
  KitEmpty,
  KitMeter,
  KitRow,
  KitScaleTrack,
  KitText,
  useComponentState,
} from "../../../kit";
import {
  wordsFor,
  balancedLine,
  detailOf,
  numberLine,
  isoDate,
  itemsOf,
  placeholderTitle,
  probesFor,
  text,
  thingOf,
  titleOf,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../../../catalog";
import { z } from "zod";
import { reviewCountLine, reviewRatingLine, reviewReading, reviewScale, reviewStarsLine } from "../copy";
// Core first: Scale/stars records one person's rating, not client reviews, replies or an aggregate breakdown.
export const meta = {
  id: "Review",
  status: "ready",
  group: "content",
  purpose: "See clients' ratings and words, their breakdown and the business's replies.",
  pick: "Business client feedback as average/count/five-bar summary or authored reviews and replies. Not logging one's own feeling or rating (Scale) or community comments (Comments).",
  writeHints: [
    'style: "summary" needs average, count and exactly five bars ordered from 1 to 5 stars. style: "list" needs one to five reviews. Omit unused fields.',
    "Each review needs stars 1–5, name, date and text, with an optional business reply.",
  ],
  region: "body",
  weight: 2,
  tier: "people",
  realPath: "Reviews left by clients in a shared app.",
  items: { key: "reviews", parts: ["root", "stars", "name", "date", "text", "response", "reply"] },
  parts: ["root", "average", "count", "bars"],
  states: ["filled", "empty"],
  actions: { items: { reply: ["press"] }, when: { reply: { style: "list" } } },
  read: (input, _state, lang?: string) => reviewReading(input as z.output<typeof props>, lang),
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
          text: text(240).overwrite(balancedLine),
          reply: text(160).overwrite(balancedLine).optional(),
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
  )
  .overwrite((value) => ({
    ...value,
    average: value.style === "summary" ? value.average : undefined,
    count: value.style === "summary" ? value.count : undefined,
    bars: value.style === "summary" ? value.bars : undefined,
    reviews:
      value.style === "list"
        ? (value.reviews ?? []).map(({ reply, ...review }) => ({ ...review, ...(reply ? { reply } : {}) }))
        : [],
  }));
export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const { placeholderDetail } = wordsFor(lang);

  const item = itemsOf(cast, 1)[0],
    thing = thingOf(cast);
  return {
    average: 0,
    count: 0,
    bars: [0, 0, 0, 0, 0],
    reviews: [
      {
        stars: 1,
        name: (item && titleOf(item, 24, thing)) || placeholderTitle(0, lang),
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
function ReviewSummary(input: Props<typeof props, typeof meta>) {
  const { lang } = useWords();
  const largest = Math.max(...input.bars!);
  return (
    <KitCard part="root" padded>
      <KitText role="number" part="average" tabular>
        {reviewRatingLine(input.average!, lang)}
      </KitText>
      <KitText role="caption" tone="muted" part="count" children={reviewCountLine(input.count!, lang)} />
      <KitScaleTrack style="stars" value={input.average!} labels={reviewScale(lang)} readonly />
      <KitCard style="plain" part="bars">
        {input.bars!.map((amount, index) => (
          <KitRow key={index} label={reviewStarsLine(index + 1, lang)} inline>
            <KitMeter
              label={reviewStarsLine(index + 1, lang)}
              amount={numberLine(amount, lang)}
              ratio={largest ? amount / largest : 0}
              slim
            />
          </KitRow>
        ))}
      </KitCard>
    </KitCard>
  );
}
function ReviewList(input: Props<typeof props, typeof meta>) {
  const { lang, words } = useWords(customersWordsFor);
  const { reviewLabels } = words;
  return (
    <KitCard part="root">
      {input.reviews!.map((review) => (
        <KitRow key={review.id} item={review.id} label={review.name} lineRole="label">
          <KitContent>
            <KitText role="label" part="name" lines={1} children={review.name} />
            <KitText role="caption" tone="muted" part="date" lines={1} children={review.date} />
            <KitText role="caption" tone="muted" part="stars">
              {reviewRatingLine(review.stars, lang)}
            </KitText>
            <KitScaleTrack style="stars" value={review.stars} labels={reviewScale(lang)} readonly />
            <KitText part="text">{review.text}</KitText>
            {review.reply && (
              <KitContent>
                <KitText role="caption" tone="muted" part={null} children={reviewLabels.response} />
                <KitText tone="muted" part="response">
                  {review.reply}
                </KitText>
              </KitContent>
            )}
            <KitAction label={reviewLabels.reply} kind="quiet" part="reply" />
          </KitContent>
        </KitRow>
      ))}
    </KitCard>
  );
}
export function Review(input: Props<typeof props, typeof meta>) {
  const state = useComponentState();
  if (state === "empty")
    return (
      <KitCard part="root">
        <KitEmpty part="text" />
      </KitCard>
    );
  return input.style === "summary" ? <ReviewSummary {...input} /> : <ReviewList {...input} />;
}
