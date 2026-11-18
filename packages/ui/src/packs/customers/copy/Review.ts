import { goalLine } from "../../../catalog";

/** Review-owned copy for the summary, breakdown and business reply action. */
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
