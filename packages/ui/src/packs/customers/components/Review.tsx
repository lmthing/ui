import { customersWordsFor } from "../lang";
// prettier-ignore
import { useWords, KitAction, KitCard, KitContent, KitEmpty, KitGrid, KitMeter, KitRow, KitScaleTrack, KitText, useComponentState, useVariant } from "../../../kit";
// prettier-ignore
import { wordsFor, balancedLine, detailOf, numberLine, isoDate, itemsOf, placeholderTitle, probesFor, text, thingOf, titleOf, variantProps, type FallbackInput, type Meta, type Probe, type Props } from "../../../catalog";
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
    'Hiding the breakdown or business replies changes only detail: {"density":null,"surface":null,"detail":"brief"}. In summary mode always write all five bar counts, even when hidden (zero for an unmentioned star level). Otherwise detail is null.',
  ],
  region: "body",
  weight: 2,
  tier: "people",
  realPath: "Reviews left by clients in a shared app.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["bars", "response"] } },
  items: { key: "reviews", parts: ["root", "stars", "name", "date", "text", "response", "reply"] },
  parts: ["root", "average", "count", "bars"],
  states: ["filled", "empty"],
  actions: { items: { reply: ["press"] }, when: { reply: { style: "list" } } },
  read: (input, _state, lang?: string): string[] => reviewReading(input as z.output<typeof props>, lang),
} as const satisfies Meta;
export const props = z
  .strictObject({
    ...variantProps(meta.variants),
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
        ? (value.reviews ?? []).map(({ reply, ...review }) => ({
            ...review,
            ...(reply && value.detail === "full" ? { reply } : {}),
          }))
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
const breakdown = { style: "summary", average: 4.5, count: 4, bars: [0, 0, 0, 2, 2] } satisfies z.input<
  typeof props
>;
export const examples = [
  breakdown,
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
  { ...breakdown, density: "compact" },
  { ...breakdown, surface: "outlined" },
  { ...breakdown, detail: "brief" },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("Review");
export const probes = [
  choose("Show what clients said about my business, with their star ratings, dates and my replies"),
  choose("Let me log how I feel today on a five-step mood scale", "Scale"),
  write(
    "List two client reviews: Ben Carter gave five stars on 2026-11-18 and said Great walks; Mia Jones gave four on 2026-11-17 and said Reliable pickups",
  ),
  {
    ...write(
      "Show our customer review average of 4.5 stars from four reviews. Two gave five stars and two gave four stars. Save those counts but don't show the individual bars.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Reply to Ben's review", { address: "r1/r1/reply", action: "press" }, 1),
] satisfies Probe[];
type ReviewProps = Props<typeof props, typeof meta>;
type ReviewView = ReviewProps & { density: NonNullable<ReviewProps["density"]> };
// prettier-ignore
function ReviewSummary(input: ReviewView) {
  const { lang } = useWords();
  const { density, surface, detail } = input;
  return (
    <KitCard part="root" padded {...{ density, surface }}>
      <KitText role="number" part="average" tabular {...{ density }} children={reviewRatingLine(input.average!, lang)} />
      <KitText role="caption" tone="muted" part="count" {...{ density }} children={reviewCountLine(input.count!, lang)} />
      <KitScaleTrack style="stars" value={input.average!} labels={reviewScale(lang)} readonly />
      {detail === "full" && <KitCard style="plain" part="bars">
        <ReviewBars bars={input.bars!} count={input.count!} {...{ density, lang }} />
      </KitCard>}
    </KitCard>
  );
}
// prettier-ignore
function ReviewBars({ bars, count, density, lang }: { bars: number[]; count: number; density: ReviewView["density"]; lang: string }) {
  const compact = density === "compact";
  const meters = bars.map((amount, index) => {
    const label = reviewStarsLine(index + 1, lang);
    const meter = <KitMeter key={index} label={label} amount={numberLine(amount, lang)} ratio={count ? amount / count : 0} slim addressed={false} />;
    return compact ? meter : <KitRow key={index} label={label} inline children={meter} />;
  });
  return compact ? <KitContent {...{ density }} children={meters} /> : meters;
}
// prettier-ignore
function ReviewList(input: ReviewView) {
  const { lang, words: { reviewLabels } } = useWords(customersWordsFor);
  const { density, surface } = input;
  return (
    <KitCard part="root" {...{ density, surface }}>
      {input.reviews!.map((review) => (
        <KitRow key={review.id} item={review.id} label={review.name} lineRole="heading" {...{ density }}>
          <KitContent {...{ density }}>
            <KitText role="heading" part="name" lines={1} {...{ density }} children={review.name} />
            <KitText role="caption" tone="muted" part="date" lines={1} {...{ density }} children={review.date} />
            <KitGrid fitLast {...{ density }}>
              <KitText role="caption" tone="muted" part="stars" {...{ density }} children={reviewRatingLine(review.stars, lang)} />
              <KitScaleTrack style="stars" value={review.stars} labels={reviewScale(lang)} readonly compact />
            </KitGrid>
            <KitText role="label" part="text" {...{ density }} children={review.text} />
            {review.reply && (
              <KitContent {...{ density }}>
                <KitText role="caption" tone="muted" part={null} {...{ density }} children={reviewLabels.response} />
                <KitText role="label" tone="muted" part="response" {...{ density }} children={review.reply} />
              </KitContent>
            )}
            <KitAction label={reviewLabels.reply} kind="quiet" part="reply" />
          </KitContent>
        </KitRow>
      ))}
    </KitCard>
  );
}
// prettier-ignore
export function Review(input: ReviewProps) {
  const state = useComponentState();
  const density = useVariant("density", meta.variants.density, input.density);
  if (state === "empty")
    return (
      <KitCard part="root" {...{ density }} surface={input.surface}>
        <KitEmpty part="text" />
      </KitCard>
    );
  return input.style === "summary" ? <ReviewSummary {...input} density={density} /> : <ReviewList {...input} density={density} />;
}
