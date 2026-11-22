import { currencies, moneyLine, type Currency } from "../../../catalog";
import { commerceWordsFor, type CommerceWords } from "../lang";

type CheckoutWords = CommerceWords["checkout"];
type CheckoutValues = {
  modes: readonly (keyof CheckoutWords["modes"])[];
  methods: readonly (keyof CheckoutWords["methods"])[];
  mode: keyof CheckoutWords["modes"];
  time?: string | undefined;
  address?: string | undefined;
};

export function checkoutChoices(
  { modes, methods }: Pick<CheckoutValues, "modes" | "methods">,
  lang?: string,
) {
  const words = commerceWordsFor(lang).checkout;
  return {
    modeChoices: modes.map((value) => ({ value, label: words.modes[value] })),
    methodChoices: methods.map((value) => ({ value, label: words.methods[value] })),
  };
}

/** The host supplies one payable basket summary; absence is not a zero total. */
export function checkoutAmount(records: readonly unknown[] | undefined, lang?: string) {
  const unavailable = commerceWordsFor(lang).checkout.unavailable;
  const record = records?.[0];
  if (records?.length !== 1 || !record || typeof record !== "object" || !("total" in record))
    return unavailable;
  const { total } = record;
  if (typeof total !== "number" || !Number.isFinite(total) || total < 0) return unavailable;
  const currency = "currency" in record ? record.currency : undefined;
  if (currency !== undefined && !currencies.includes(currency as Currency)) return unavailable;
  return moneyLine(total, currency as Currency | undefined, undefined, lang);
}

export function checkoutReading(
  input: CheckoutValues,
  state: string,
  records: readonly unknown[] | undefined,
  lang?: string,
): string[] {
  const words = commerceWordsFor(lang).checkout;
  const details = [
    ...(input.time ? [words.time] : []),
    ...(input.mode === "delivery" && input.address ? [words.address] : []),
  ];
  const total = [words.total, checkoutAmount(records, lang)];
  if (state === "success") return [words.success, ...details, ...total];
  if (state !== "filled") return [];
  return [
    words.fulfillment,
    ...input.modes.map((mode) => words.modes[mode]),
    ...details,
    ...(input.mode === "delivery" && !input.address ? [words.addAddress] : []),
    words.payment,
    ...input.methods.map((method) => words.methods[method]),
    ...total,
    words.place,
  ];
}
