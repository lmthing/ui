import { localeOf } from "../../../catalog";
import { moneyWordsFor, type MoneyWords } from "../lang";

type KeypadWords = MoneyWords["amountPad"];
type Key = { id: string; label: string; value: { append: string } | { backspace: true } };
type Amount = number | string | undefined;

// Keep the display and the runtime's editable decimal text identical, including very small values.
const plainDecimal = new Intl.NumberFormat(localeOf(), { useGrouping: false, maximumSignificantDigits: 21 });

export function amountPadText(value: Amount): string {
  return typeof value === "number" ? plainDecimal.format(value === 0 ? 0 : value) : (value ?? "");
}

/** Translate each glyph so an unfinished edit and trailing zeros survive formatting. */
export function amountPadDisplay(draft: string, lang?: string): string {
  const { decimal, digits } = moneyWordsFor(lang).amountPad;
  return draft.replace(/[0-9.]/g, (glyph) => (glyph === "." ? decimal : digits[Number(glyph)]!));
}

export function amountPadKeys(words: KeypadWords): Key[] {
  const digits = words.digits.map((label, digit) => ({
    label,
    value: { append: String(digit) },
  }));
  const keys: Omit<Key, "id">[] = [
    ...digits.slice(1),
    { label: words.decimal, value: { append: "." } },
    digits[0]!,
    { label: words.backspace, value: { backspace: true } },
  ];
  return keys.map((key, index) => ({ ...key, id: `r${index + 1}` }));
}

export function amountPadReading(
  { value, note }: { value?: Amount; note: boolean },
  lang?: string,
): string[] {
  const words = moneyWordsFor(lang).amountPad;
  const amount = amountPadDisplay(amountPadText(value), lang);
  const keys = amountPadKeys(words).map(({ label }) => label);
  return [...(amount ? [amount] : []), keys.join(" "), ...(note ? [words.note] : [])];
}
