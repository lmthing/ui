import { appointmentDate, numberLine, type StateName } from "../../../catalog";
import { moneyWordsFor, type MoneyWords } from "../lang";

type Rating = keyof MoneyWords["creditScore"]["rating"];
type Impact = keyof MoneyWords["creditScore"]["impact"];
type ScoreInput = {
  score: number;
  previousScore?: number | undefined;
  bureau: string;
  updatedAt: string;
  factors: readonly { rating: Rating; impact: Impact }[];
  detail?: "full" | "brief" | undefined;
};

export const creditScoreScale = { min: 300, max: 850 } as const;
const bands = [
  { rating: "poor", from: creditScoreScale.min, to: 580, tone: "bad" },
  { rating: "fair", from: 580, to: 670, tone: "warn" },
  { rating: "good", from: 670, to: 800, tone: "accent" },
  { rating: "excellent", from: 800, to: creditScoreScale.max, tone: "good" },
] as const;

export function creditScoreZones(lang?: string) {
  const { rating } = moneyWordsFor(lang).creditScore;
  return bands.map(({ rating: key, ...band }) => ({ ...band, label: rating[key] }));
}

export function creditScoreCopy(input: ScoreInput, lang?: string) {
  const words = moneyWordsFor(lang).creditScore;
  const band = bands.find(({ to }) => input.score < to) ?? bands[bands.length - 1]!;
  const change = input.previousScore === undefined ? undefined : input.score - input.previousScore;
  return {
    score: numberLine(input.score, lang),
    rating: words.rating[band.rating],
    delta:
      change === undefined ? undefined : words.change(`${change > 0 ? "+" : ""}${numberLine(change, lang)}`),
    report: words.updated(input.bureau, appointmentDate(input.updatedAt, lang)),
  };
}

export function creditScoreReading(input: ScoreInput, state: StateName, lang?: string): string[] {
  if (state !== "filled") return [];
  const words = moneyWordsFor(lang).creditScore;
  const { score, rating, delta, report } = creditScoreCopy(input, lang);
  const zones =
    input.detail === "brief"
      ? []
      : creditScoreZones(lang).map(({ label, from, to }) =>
          words.zone(label, numberLine(from, lang), numberLine(to, lang)),
        );
  return [
    words.label,
    score,
    rating,
    ...(delta ? [delta] : []),
    report,
    ...zones,
    words.factors,
    ...input.factors.map((factor) => `${words.rating[factor.rating]} · ${words.impact[factor.impact]}`),
    words.refresh,
  ];
}
