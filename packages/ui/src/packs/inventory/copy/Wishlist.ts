import { compactMoneyLine } from "../../../catalog";
import { inventoryWordsFor } from "../lang";

type Wish = {
  price?: number | undefined;
  target?: number | undefined;
  priority: number;
};
type Detail = "full" | "brief";

export function wishCopy({ price, target, priority }: Wish, detail: Detail, lang?: string) {
  const words = inventoryWordsFor(lang).wishlist;
  return {
    price: price === undefined ? undefined : words.price(compactMoneyLine(price, undefined, lang)),
    target:
      detail === "full" && target !== undefined
        ? words.target(compactMoneyLine(target, undefined, lang))
        : undefined,
    priority: priority === 1 ? words.priority[1] : priority === 2 ? words.priority[2] : words.priority[3],
  };
}

export function wishReading({ items, detail }: { items: Wish[]; detail: Detail }, lang?: string): string[] {
  const words = inventoryWordsFor(lang).wishlist;
  return items.map((wish, index) => {
    const { price, target, priority } = wishCopy(wish, detail, lang);
    const fields = [price, target, priority, words.got].filter((line): line is string => line !== undefined);
    return `r${index + 1} ${fields.join(words.separator)}`;
  });
}
