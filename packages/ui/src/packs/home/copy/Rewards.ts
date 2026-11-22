import { compactMoneyLine, localeOf, numberLine, pluralForm } from "../../../catalog";
import { homeWordsFor } from "../lang";

type RewardEntry = { id?: string } & (
  { entryKind: "kid"; name: string; points: number } | { entryKind: "prize"; title: string; cost: number }
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

/** Keep fractional money in the same line without shrinking its main figure to body size. */
export function rewardBalanceParts(value: string, money: boolean, lang?: string) {
  const decimal = new Intl.NumberFormat(localeOf(lang))
    .formatToParts(1.1)
    .find((part) => part.type === "decimal");
  const split = money && decimal ? value.indexOf(decimal.value) : -1;
  const major = split < 1 ? value : value.slice(0, split);
  const minor = split < 1 ? "" : value.slice(split);
  return { major, minor, compact: major.length + (minor ? 1 : 0) > 4 };
}

export function rewardShortfall(cost: number, best: number, money: boolean, lang?: string) {
  if (cost <= best) return undefined;
  const { rewardNeeds } = homeWordsFor(lang);
  const difference = cost - best;
  if (money && difference < 0.005) return rewardNeeds();
  const rounded = difference < Number.MAX_SAFE_INTEGER ? Number(difference.toPrecision(15)) : difference;
  return rewardNeeds(rewardAmount(rounded, money, lang).value);
}

export function rewardReading(
  entries: readonly RewardEntry[],
  money: boolean,
  state: string,
  lang?: string,
  brief = false,
) {
  const words = homeWordsFor(lang);
  if (state === "success") return [words.rewardLabels.success];
  if (state !== "filled") return [];
  const best = Math.max(0, ...entries.map((entry) => (entry.entryKind === "kid" ? entry.points : 0)));
  return [
    words.rewardLabels.heading,
    ...entries.map((entry) => {
      const name = entry.entryKind === "kid" ? entry.name : entry.title;
      const amount = entry.entryKind === "kid" ? entry.points : entry.cost;
      const line = words.rewardEntry(name, rewardAmount(amount, money, lang).label);
      const reason =
        entry.entryKind !== "prize" || amount <= best
          ? undefined
          : brief
            ? words.rewardLabels.unavailable
            : rewardShortfall(amount, best, money, lang);
      const copy = reason ? words.rewardPrizeStatus(line, reason) : line;
      return entry.id ? `${entry.id} ${copy}` : copy;
    }),
    words.rewardLabels.claim,
  ];
}
