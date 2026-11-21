import { numberLine, pluralForm } from "../../format";
import { wordsFor } from "../../lang";
import { goalLine } from "..";

/** Review-owned copy for the summary, breakdown and business reply action. */
export const { reviewLabels } = wordsFor();
export const reviewCountLine = (count: number, lang?: string): string =>
  wordsFor(lang).reviews(numberLine(count, lang), pluralForm(count, lang));
export const reviewStarsLine = (stars: number, lang?: string): string =>
  wordsFor(lang).stars(numberLine(stars, lang), pluralForm(stars, lang));
export const reviewRatingLine = (value: number, lang?: string) =>
  `${numberLine(value, lang)} ${goalLine(5, lang)}`;
export const reviewScale = (lang?: string) =>
  [1, 2, 3, 4, 5].map((stars) => reviewRatingLine(stars, lang)) as [string, string, string, string, string];

type ReviewCopy = {
  id?: string;
  stars: number;
  date: string;
  text?: string | undefined;
  reply?: string | undefined;
  photos?: readonly string[] | undefined;
  fitScale?: number | undefined;
  verified?: boolean | undefined;
  spoiler?: boolean | undefined;
  expanded?: boolean | undefined;
};

export const reviewFitLine = (value: number, lang?: string) => wordsFor(lang).reviewLabels.fit(value);

/** Read only what is drawn, including review text only after the spoiler is revealed. */
export function reviewReading(
  input: {
    style: "summary" | "list";
    detail?: "full" | "brief";
    average?: number | undefined;
    count?: number | undefined;
    bars?: number[] | undefined;
    reviews?: ReviewCopy[] | undefined;
  },
  lang?: string,
): string[] {
  const { reviewLabels } = wordsFor(lang);
  return input.style === "summary"
    ? [
        reviewRatingLine(input.average!, lang),
        reviewCountLine(input.count!, lang),
        ...(input.detail === "brief"
          ? []
          : input.bars!.map(
              (amount, index) => `${reviewStarsLine(index + 1, lang)} ${numberLine(amount, lang)}`,
            )),
      ]
    : input.reviews!.flatMap((review) => [
        reviewRatingLine(review.stars, lang),
        review.date,
        ...(review.verified ? [reviewLabels.verified] : []),
        ...(review.spoiler ? [review.expanded ? reviewLabels.hideSpoiler : reviewLabels.showSpoiler] : []),
        reviewLabels.reply,
        ...(review.spoiler && !review.expanded ? [] : reviewDetailsReading(review, lang)),
      ]);
}

function reviewDetailsReading(review: ReviewCopy, lang?: string) {
  return [
    ...(review.text ? [JSON.stringify(review.text)] : []),
    ...(review.fitScale === undefined ? [] : [reviewFitLine(review.fitScale, lang)]),
    ...(review.photos ?? []).map((photo) => `photo:${photo.replace(/^lib:/, "")}`),
    ...(review.reply ? [wordsFor(lang).reviewLabels.response, JSON.stringify(review.reply)] : []),
  ];
}
