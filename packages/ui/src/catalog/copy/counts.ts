/** The goal under a progress number: "of 5". */
export function goalLine(of: number): string {
  return `of ${of}`;
}

/** Place in a sequence: "Step 2 of 3". */
export function stepLine(at: number, count: number): string {
  return `Step ${at} of ${count}`;
}

/** A total over a chart: "Total 23 walks", or "Total 23" without a unit. */
export function totalLine(total: number, unit?: string): string {
  return unit ? `Total ${total} ${unit}` : `Total ${total}`;
}

/** The direction of a trend from its first to its last point: "rising", "falling" or "steady". */
export function trendWord(points: readonly number[]): "rising" | "falling" | "steady" {
  const [first, last] = [points[0] ?? 0, points[points.length - 1] ?? 0];
  return last > first ? "rising" : last < first ? "falling" : "steady";
}

/** Accessible names for the two buttons of a counter. */
export const stepLabels = { less: "One less", more: "One more" } as const;

/** The two small actions a message can offer. */
export const messageLabels = { retry: "Try again", undo: "Undo", dismiss: "Dismiss" } as const;

/** The people beyond those shown: "+3". */
export function moreLine(count: number): string {
  return `+${count}`;
}

/** A part's share of a whole as a rounded percent: "42%". */
export function percentLine(value: number, total: number): string {
  return `${total > 0 ? Math.round((value / total) * 100) : 0}%`;
}

export const badgeLine = (count: number): string => (count > 99 ? "99+" : String(count));

/** Shared review copy for the summary, breakdown and business reply action. */
export const reviewLabels = { reply: "Reply", response: "Business reply" } as const;
export const reviewCountLine = (count: number): string => `${count} ${count === 1 ? "review" : "reviews"}`;
export const reviewStarsLine = (stars: number): string => `${stars} ${stars === 1 ? "star" : "stars"}`;
export const reviewScaleLabels = [1, 2, 3, 4, 5].map((stars) => `${stars} ${goalLine(5)}`) as [
  string,
  string,
  string,
  string,
  string,
];

/** Numeric review content and reply copy, alongside the reader's authored text. */
export function reviewReading(input: {
  style: "summary" | "list";
  average?: number | undefined;
  count?: number | undefined;
  bars?: number[] | undefined;
  reviews?: { stars: number; date: string; reply?: string | undefined }[] | undefined;
}): string[] {
  return input.style === "summary"
    ? [
        `${input.average} ${goalLine(5)}`,
        reviewCountLine(input.count!),
        ...input.bars!.map((amount, index) => `${reviewStarsLine(index + 1)} ${amount}`),
      ]
    : input.reviews!.flatMap((review) => [
        `${review.stars} ${goalLine(5)}`,
        review.date,
        reviewLabels.reply,
        ...(review.reply ? [reviewLabels.response] : []),
      ]);
}
