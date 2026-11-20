import { documentFieldLine, moneyLine } from "../../../catalog";
import { commerceWordsFor } from "../lang";

type ProductPrice = { price: number; was?: number | undefined };

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
