import { customersWordsFor } from "../lang";
import { goalLine, numberLine, pluralForm } from "../../../catalog";

/** Review-owned copy for the summary, breakdown and business reply action. */
export const { reviewLabels } = customersWordsFor();
export const reviewCountLine = (count: number, lang?: string): string =>
  customersWordsFor(lang).reviews(numberLine(count, lang), pluralForm(count, lang));
export const reviewStarsLine = (stars: number, lang?: string): string =>
  customersWordsFor(lang).stars(numberLine(stars, lang), pluralForm(stars, lang));
export const reviewRatingLine = (value: number, lang?: string) =>
  `${numberLine(value, lang)} ${goalLine(5, lang)}`;
export const reviewScale = (lang?: string) =>
  [1, 2, 3, 4, 5].map((stars) => reviewRatingLine(stars, lang)) as [string, string, string, string, string];
export const reviewScaleLabels = reviewScale();

/** Numeric review content and reply copy, alongside the reader's authored text. */
export function reviewReading(
  input: {
    style: "summary" | "list";
    average?: number | undefined;
    count?: number | undefined;
    bars?: number[] | undefined;
    reviews?: { stars: number; date: string; reply?: string | undefined }[] | undefined;
  },
  lang?: string,
): string[] {
  const { reviewLabels } = customersWordsFor(lang);
  return input.style === "summary"
    ? [
        reviewRatingLine(input.average!, lang),
        reviewCountLine(input.count!, lang),
        ...input.bars!.map(
          (amount, index) => `${reviewStarsLine(index + 1, lang)} ${numberLine(amount, lang)}`,
        ),
      ]
    : input.reviews!.flatMap((review) => [
        reviewRatingLine(review.stars, lang),
        review.date,
        reviewLabels.reply,
        ...(review.reply ? [reviewLabels.response] : []),
      ]);
}
