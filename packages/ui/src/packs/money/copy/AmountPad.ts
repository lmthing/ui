import { localeOf } from "../../../catalog";
import { moneyWordsFor, type MoneyWords } from "../lang";

type KeypadWords = MoneyWords["amountPad"];
type Key = { id: string; label: string; value: { append: string } | { backspace: true }; disabled?: boolean };
type Amount = number | string | undefined;

// Serialize the runtime draft without scientific notation, including very small values.
const plainDecimal = new Intl.NumberFormat(localeOf(), { useGrouping: false, maximumSignificantDigits: 21 });

export function amountPadText(value: Amount): string {
  return typeof value === "number" ? plainDecimal.format(value === 0 ? 0 : value) : (value ?? "");
}

/** Translate each glyph so an unfinished edit and trailing zeros survive formatting. */
export function amountPadDisplay(draft: string, lang?: string): string {
  const { decimal, digits } = moneyWordsFor(lang).amountPad;
  return draft
    ? draft.replace(/[0-9.]/g, (glyph) => (glyph === "." ? decimal : digits[Number(glyph)]!))
    : digits[0];
}

export function amountPadKeys(words: KeypadWords, hasDraft: boolean): Key[] {
  const digits = words.digits.map((label, digit) => ({
    label,
    value: { append: String(digit) },
  }));
  const keys: Omit<Key, "id">[] = [
    ...digits.slice(1),
    { label: words.decimal, value: { append: "." } },
    digits[0]!,
    { label: words.backspace, value: { backspace: true }, disabled: !hasDraft },
  ];
  return keys.map((key, index) => ({ ...key, id: `r${index + 1}` }));
}

export function amountPadReading(
  { value, note, detail }: { value?: Amount; note: boolean; detail?: "full" | "brief" },
  lang?: string,
): string[] {
  const words = moneyWordsFor(lang).amountPad;
  const draft = amountPadText(value);
  const keys = amountPadKeys(words, Boolean(draft)).map(({ label }) => label);
  return [amountPadDisplay(draft, lang), keys.join(" "), ...(note && detail !== "brief" ? [words.note] : [])];
}
