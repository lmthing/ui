import { documentFieldLine, moneyLine, percentageLine } from "../../../catalog";
import { commerceWordsFor } from "../lang";
import { offerRemaining } from "./Promo";

type ProductPrice = { price: number; was?: number | undefined };

export function dealBadge(
  { badge, price, was }: ProductPrice & { badge?: string | undefined },
  lang?: string,
) {
  return (
    badge ?? (was && was > price ? percentageLine(Math.round(((price - was) / was) * 100), lang) : undefined)
  );
}

export function productAmounts({ price, was }: ProductPrice, lang?: string) {
  return {
    price: moneyLine(price, undefined, undefined, lang),
    was: was === undefined ? undefined : moneyLine(was, undefined, undefined, lang),
  };
}

export function productReading(item: ProductPrice & { name: string }, lang?: string) {
  const { price, was } = productAmounts(item, lang);
  const amount = was === undefined ? price : commerceWordsFor(lang).priceChange(was, price);
  return documentFieldLine(item.name, amount, lang);
}

type GridReading = {
  style?: "deals" | undefined;
  ends?: string | undefined;
  endsAt?: string | undefined;
  remainingMs?: number | undefined;
  items: readonly (ProductPrice & {
    name: string;
    badge?: string | undefined;
    claimed?: number | undefined;
  })[];
};

export function dealsReading(input: GridReading, lang?: string): string[] {
  if (input.style !== "deals") return input.items.map((item) => productReading(item, lang));
  const words = commerceWordsFor(lang);
  const remaining = offerRemaining(input, lang);
  return [
    words.deals,
    ...(remaining ? [remaining] : []),
    ...input.items.map((item) => {
      const claimed =
        item.claimed === undefined
          ? undefined
          : documentFieldLine(words.claimed, percentageLine(item.claimed, lang), lang);
      const badge = item.badge === undefined ? dealBadge(item, lang) : undefined;
      return [productReading(item, lang), badge, claimed].filter(Boolean).join(words.receiptSeparator);
    }),
  ];
}
