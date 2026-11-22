import { z } from "zod";
// prettier-ignore
import { useWords, KitCard, KitContent, KitEmpty, KitGrid, KitMeter, KitPhoto, KitRow, KitScaleTrack, KitText, KitTrail, useComponentState, useLiveControls, useKit } from "../kit";
// prettier-ignore
import { wordsFor, balancedLine, detailOf, numberLine, photo, isoDate, itemsOf, placeholderTitle, probesFor, reviewCountLine, reviewFitLine, reviewRatingLine, reviewReading, reviewScale, reviewStarsLine, text, thingOf, titleOf, type FallbackInput, type Meta, type Probe, type Props, type ThemeDensity, variantProps } from "../catalog";
import { prompt } from "../entry/prompt-Review.generated";
// Core first: Scale/stars records one person's rating, not client reviews, replies or an aggregate breakdown.
// prettier-ignore
export const meta = {
  id: "Review",
  status: "ready",
  group: "content",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 2,
  tier: "people",
  realPath: "Reviews left by clients in a shared app.",
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["bars", "response"] } },
  items: { key: "reviews", parts: [
    "root", "stars", "name", "date", "text", "response", "reply", "reply_label",
    "verified", "fit", "spoiler_label", "photo_1", "photo_2", "photo_3",
  ] },
  parts: ["root", "average", "count", "bars"],
  partTiers: { root: "phone" },
  states: ["filled", "empty"],
  actions: { items: { root: ["toggle"], reply: ["press"] }, when: { root: { spoiler: true }, reply: { style: "list" } } },
  select: { prop: "expanded", value: "index", mode: "flags", runtime: true },
  read: (input, state, lang): string[] => (state === "filled" ? reviewReading(input as ReviewProps, lang) : []),
} as const satisfies Meta;
const review = z.strictObject({
  stars: z.int().min(1).max(5),
  name: text(24),
  date: isoDate,
  text: text(240).overwrite(balancedLine).meta({ kind: undefined }),
  reply: text(160).overwrite(balancedLine).meta({ kind: undefined }).optional(),
  photos: z.array(photo).min(1).max(3).optional(),
  fitScale: z.int().min(1).max(5).optional(),
  spoiler: z.boolean().optional(),
  verified: z.boolean().optional(),
});
// prettier-ignore
export const props = z.strictObject({
  ...variantProps(meta.variants), style: z.enum(["summary", "list"]).default("summary"),
  average: z.number().min(0).max(5).optional(), count: z.int().min(0).optional(),
  bars: z.array(z.number().min(0)).min(5).max(5).optional(), reviews: z.array(review).min(1).max(5).optional(),
}).refine(({ style, average, count, bars, reviews }) =>
  style === "summary" ? average !== undefined && count !== undefined && bars !== undefined : reviews !== undefined,
  { message: "Supply the active style's fields" },
).overwrite(({ average, count, bars, reviews, ...value }) => ({
  ...value, average: value.style === "summary" ? average : undefined, count: value.style === "summary" ? count : undefined,
  bars: value.style === "summary" ? bars : undefined,
  reviews: value.style === "list"
    ? (reviews ?? []).map(({ reply, ...row }) => ({ ...row, ...(reply && value.detail === "full" ? { reply } : {}) }))
    : [],
}));
export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const [item] = itemsOf(cast, 1);
  const thing = thingOf(cast);
  return {
    average: 0,
    count: 0,
    bars: [0, 0, 0, 0, 0],
    reviews: [
      {
        stars: 1,
        name: (item && titleOf(item, 24, thing)) || placeholderTitle(0, lang),
        date: "2026-11-18",
        text: (item && detailOf(item, 240, thing)) || wordsFor(lang).placeholderDetail,
      },
    ],
  };
}
const breakdown = { style: "summary" as const, average: 4.5, count: 4, bars: [0, 0, 0, 2, 2] };
// prettier-ignore
export const examples = [
  breakdown,
  { style: "list", reviews: [
    { stars: 5, name: "Ben Carter", date: "2026-11-18", text: "Clover and Pip come home happy after every walk.",
      reply: "Thank you, Ben. They are a lovely pair.", photos: ["lib:dogs", "lib:park"], verified: true },
    { stars: 4, name: "Mia Jones", date: "2026-11-17", text: "Reliable pickups and clear updates." },
  ] },
  { ...breakdown, detail: "brief" },
  { style: "list", reviews: [
    { stars: 4, name: "Mia Jones", date: "2026-11-17", text: "The rain coat kept Maple dry the whole loop.", fitScale: 3 },
    { stars: 5, name: "Ana Reed", date: "2026-11-18", text: "The shy dog finally leads the pack in the last scene.", spoiler: true },
  ] },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("Review");
// prettier-ignore
export const probes = [
  choose("Show what clients said about my business, with their star ratings, dates and my replies"),
  choose("Let me log how I feel today on a five-step mood scale", "Scale"),
  write("List two client reviews: Ben Carter gave five stars on 2026-11-18 and said Great walks; Mia Jones gave four on 2026-11-17 and said Reliable pickups"),
  {
    ...write("Show our customer review average of 4.5 stars from four reviews. Two gave five stars and two gave four stars. Save those counts but don't show the individual bars."),
    variant: { axis: "detail", value: "brief" },
  },
  read("Reply to Ben's review", { address: "r1/r1/reply", action: "press" }, 1),
  read("Reveal the plot detail hidden in Ana's review", { address: "r1/r2", action: "toggle" }, 3),
] satisfies Probe[];
type ReviewProps = Props<typeof props, typeof meta>;
type ReviewView = ReviewProps & { density: ThemeDensity };
type ReviewItem = NonNullable<ReviewProps["reviews"]>[number] & { expanded?: boolean };
// prettier-ignore
function ReviewSummary(input: ReviewView) {
  const { lang } = useWords();
  const { density, detail  } = input;
  const surface = "card";
  return (
    <KitCard part="root" padded {...{ density, surface }}>
      <KitText role="number" part="average" tabular {...{ density }} children={reviewRatingLine(input.average!, lang)} />
      <KitText role="caption" tone="muted" part="count" {...{ density }} children={reviewCountLine(input.count!, lang)} />
      <KitScaleTrack style="stars" value={input.average!} labels={reviewScale(lang)} readonly compact />
      {detail === "full" && <KitCard style="plain" part="bars">
        <ReviewBars bars={input.bars!} count={input.count!} {...{ density, lang }} />
      </KitCard>}
    </KitCard>
  );
}
// prettier-ignore
function ReviewBars({ bars, count, density, lang }: { bars: number[]; count: number; density: ThemeDensity; lang: string }) {
  const compact = density === "compact";
  const meters = bars.map((amount, index) => {
    const label = reviewStarsLine(index + 1, lang);
    const meter = <KitMeter key={index} label={label} amount={numberLine(amount, lang)} ratio={count ? amount / count : 0} slim addressed={false} />;
    return compact ? meter : <KitRow key={index} label={label} inline children={meter} />;
  }).reverse();
  return compact ? <KitContent {...{ density }} children={meters} /> : meters;
}
// prettier-ignore
function ReviewEntry({ review, density }: { review: ReviewItem; density: ThemeDensity }) {
  const { lang, words: { reviewLabels: words } } = useWords();
  const { spoiler, expanded } = review;
  const hidden = spoiler && !expanded;
  const disclosure = expanded ? words.hideSpoiler : words.showSpoiler;
  return (
    <KitRow item={review.id} part={spoiler ? null : "root"} label={review.name} lineRole="heading" inline {...{ density }}>
      <KitContent {...{ density }}>
        <KitRow inline label={review.name} lineRole="heading" {...{ density }} trailing={review.verified &&
          <KitTrail kind="badge" value={words.verified} part="verified" {...{ density }} />}>
          <KitText role="heading" part="name" lines={1} {...{ density }}>{review.name}</KitText>
        </KitRow>
        <KitContent lineRole="body" {...{ density }}
          lead={<KitScaleTrack style="stars" value={review.stars} labels={reviewScale(lang)} readonly compact />}>
          <KitText role="number" numberScale="compact" tabular part="stars" {...{ density }}>{reviewRatingLine(review.stars, lang)}</KitText>
        </KitContent>
        <KitText role="caption" tone="muted" part="date" lines={1} {...{ density }}>{review.date}</KitText>
        {spoiler && (
          <KitRow part="root" role="button" expanded={expanded === true} label={disclosure} lineRole="body" inline>
            <KitText role="label" tone="accent" part="spoiler_label">{disclosure}</KitText>
          </KitRow>
        )}
        {!hidden && <ReviewDetails review={review} {...{ density }} />}
        <KitRow part="reply" role="button" label={words.reply} lineRole="label" inline>
          <KitText role="label" tone="accent" part="reply_label">{words.reply}</KitText>
        </KitRow>
      </KitContent>
    </KitRow>
  );
}
// prettier-ignore
function ReviewDetails({ review, density }: { review: ReviewItem; density: ThemeDensity }) {
  const { lang, words: { reviewLabels: words } } = useWords();
  return (
    <KitContent {...{ density }}>
      <KitText role="label" part="text" {...{ density }}>{review.text}</KitText>
      {review.fitScale !== undefined && <KitText role="caption" part="fit" tone="muted">{reviewFitLine(review.fitScale, lang)}</KitText>}
      {review.photos && <KitGrid columns={3}>
        {review.photos.map((photo, index) => (
          <KitPhoto key={index} part={`photo_${index + 1}`} shape="square" label={words.photo(numberLine(index + 1, lang))} {...{ photo }} />
        ))}
      </KitGrid>}
      {review.reply && <KitContent group="response" {...{ density }}>
        <KitText role="caption" tone="muted" part={null} {...{ density }}>{words.response}</KitText>
        <KitText role="label" tone="muted" part="response" {...{ density }}>{review.reply}</KitText>
      </KitContent>}
    </KitContent>
  );
}
// prettier-ignore
export function Review(input: ReviewProps) {
  const state = useComponentState();
  const density = useKit().density;
  const live = useLiveControls(meta, input) as ReviewView & { reviews?: ReviewItem[] };
  if (state === "empty") return <KitCard part="root" {...{ density }} surface={"card"}><KitEmpty part="text" /></KitCard>;
  if (input.style === "summary") return <ReviewSummary {...input} density={density} />;
  return (
    <KitCard part="root" padded {...{ density }} surface={"card"}>
      {live.reviews?.map((review, index) => <KitContent key={review.id} group={index ? "response" : "content"} {...{ density }}><ReviewEntry {...{ review, density }} /></KitContent>)}
    </KitCard>
  );
}
