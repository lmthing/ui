import { documentFieldLine, moneyLine, numberLine } from "../../../catalog";
import { commerceWordsFor } from "../lang";

type ProductDetail = { price: number; was?: number | undefined; stock?: number | undefined; qty: number };
type Store = {
  aisle?: string | undefined;
  storeName?: string | undefined;
  storeStock?: number | undefined;
  cleanTags?: readonly string[] | undefined;
  scan?: { goto: string } | undefined;
};

export function productStoreLines({ aisle, storeName, storeStock }: Store, lang?: string) {
  const { product } = commerceWordsFor(lang);
  return [
    ["store_name", storeName],
    ["aisle", aisle && product.aisle(aisle)],
    ["store_stock", storeStock === undefined ? undefined : product.storeStock(numberLine(storeStock, lang))],
  ] as const;
}

export function productDetailCopy({ price, was, stock }: ProductDetail, lang?: string) {
  const { product: words } = commerceWordsFor(lang);
  return {
    price: moneyLine(price, undefined, undefined, lang),
    was: was === undefined ? undefined : moneyLine(was, undefined, undefined, lang),
    stock:
      stock === undefined ? undefined : stock === 0 ? words.soldOut : words.stock(numberLine(stock, lang)),
  };
}

export function productDetailReading(input: ProductDetail & Store, state: string, lang?: string): string[] {
  if (state !== "filled" && state !== "success") return [];
  const { price, was, stock } = productDetailCopy(input, lang);
  const { priceChange, product: words } = commerceWordsFor(lang);
  return [
    was === undefined ? price : priceChange(was, price),
    ...(stock === undefined || input.stock === undefined
      ? []
      : [documentFieldLine(words.stockField, numberLine(input.stock, lang), lang), stock]),
    ...productStoreLines(input, lang).flatMap(([, line]) => (line ? [line] : [])),
    ...(input.cleanTags ?? []),
    ...(state === "filled" && input.scan ? [words.scan] : []),
    ...(state === "success"
      ? [words.added]
      : [words.quantity(numberLine(input.stock === 0 ? 0 : input.qty, lang)), words.add]),
  ];
}
