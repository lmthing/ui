import { emptyLine, moneyLine, numberLine, type AppCurrency, type StateName } from "../../../catalog";
import { commerceWordsFor } from "../lang";

type SavedItem = {
  name: string;
  price: number;
  savedPrice?: number | undefined;
  targetPrice?: number | undefined;
  stock?: number | undefined;
};

const lowStock = 3;

export function savedItemCopy(item: SavedItem, lang?: string, currency?: AppCurrency) {
  const { product, savedList } = commerceWordsFor(lang);
  const money = (amount: number) => moneyLine(amount, currency, undefined, lang);
  const { price, savedPrice, stock, targetPrice } = item;
  const drop = savedPrice === undefined ? 0 : Math.round(savedPrice * 100) - Math.round(price * 100);
  const badge =
    stock === 0
      ? { tone: "bad" as const, text: product.soldOut }
      : stock !== undefined && stock <= lowStock
        ? { tone: "warn" as const, text: product.stock(numberLine(stock, lang)) }
        : drop > 0
          ? { tone: "good" as const, text: savedList.priceDrop(money(drop / 100)) }
          : undefined;
  return {
    current: money(price),
    previous:
      savedPrice === undefined || savedPrice === price ? undefined : savedList.previous(money(savedPrice)),
    target: targetPrice === undefined ? undefined : money(targetPrice),
    badge,
  };
}

export function savedListReading(
  {
    items,
    shared,
    moved,
  }: {
    items: (SavedItem & { id: string })[];
    shared: boolean;
    moved?: boolean;
  },
  state: StateName,
  lang?: string,
  currency?: AppCurrency,
): string[] {
  if (state !== "filled" && state !== "success") return [];
  const { savedList, receiptSeparator } = commerceWordsFor(lang);
  const lines = items.map((item) => {
    const { current, previous, target, badge } = savedItemCopy(item, lang, currency);
    return [
      item.id,
      item.name,
      current,
      previous,
      badge?.text,
      savedList.target,
      target,
      shared && savedList.claim,
      item.stock !== 0 && savedList.move,
    ]
      .filter(Boolean)
      .join(receiptSeparator);
  });
  if (!items.length) lines.push(emptyLine(undefined, lang));
  else if (items.some(({ stock }) => stock !== 0)) lines.unshift(savedList.readActions);
  return state === "success" || moved ? [savedList.success, ...lines] : lines;
}
