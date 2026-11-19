import { compactMoneyLine, localeOf, numberLine, pluralForm } from "../../../catalog";
import { homeWordsFor } from "../lang";

type RewardEntry = { id?: string } & (
  | { entryKind: "kid"; name: string; points: number }
  | { entryKind: "prize"; title: string; cost: number; claimable: boolean }
);

export function rewardAmount(amount: number, money: boolean, lang?: string) {
  if (money) {
    const value = compactMoneyLine(amount, undefined, lang);
    return { value, unit: undefined, label: value };
  }
  const words = homeWordsFor(lang);
  const exact = numberLine(amount, lang);
  const value =
    exact.length <= 8
      ? exact
      : new Intl.NumberFormat(localeOf(lang), { notation: "scientific", maximumSignificantDigits: 3 }).format(
          amount,
        );
  const unit = words.rewardLabels.units[pluralForm(amount, lang) === "one" ? "one" : "other"];
  return { value, unit, label: words.rewardPoints(value, unit) };
}

export function rewardJarRatio(points: number, target: number): number {
  return points === 0 ? 0 : target === 0 ? 1 : Math.min(1, points / target);
}

export function rewardReading(entries: readonly RewardEntry[], money: boolean, state: string, lang?: string) {
  const words = homeWordsFor(lang);
  if (state === "success") return [words.rewardLabels.success];
  if (state !== "filled") return [];
  return [
    words.rewardLabels.heading,
    ...entries.map((entry) => {
      const name = entry.entryKind === "kid" ? entry.name : entry.title;
      const amount = entry.entryKind === "kid" ? entry.points : entry.cost;
      const line = words.rewardEntry(name, rewardAmount(amount, money, lang).label);
      return entry.id ? `${entry.id} ${line}` : line;
    }),
    words.rewardLabels.claim,
  ];
}
