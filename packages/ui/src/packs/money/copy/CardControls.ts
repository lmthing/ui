import { moneyLine, type AppCurrency, type StateName } from "../../../catalog";
import { moneyWordsFor, type MoneyWords } from "../lang";

export const cardChannels = ["online", "atm", "international"] as const;

type CardCopyInput = {
  network: keyof MoneyWords["cardControls"]["network"];
  last4: string;
  expires?: string | undefined;
  spendCap?: number | undefined;
  detail?: "full" | "brief" | undefined;
  maskedNumber?: string | undefined;
  cvv?: string | undefined;
};

export function cardControlsCopy(input: CardCopyInput, lang?: string) {
  const { cardControls: words } = moneyWordsFor(lang);
  return {
    network: words.network[input.network],
    last4: words.last4(input.last4),
    expires: input.expires ? words.expires(input.expires) : undefined,
  };
}

export function cardControlsReading(
  input: CardCopyInput,
  state: StateName,
  lang?: string,
  currency?: AppCurrency,
) {
  const { cardControls: words } = moneyWordsFor(lang);
  const { network, last4, expires } = cardControlsCopy(input, lang);
  const cap =
    input.detail !== "brief" && input.spendCap !== undefined
      ? words.capReading(moneyLine(input.spendCap, currency, undefined, lang))
      : undefined;
  const controls = [words.freeze, ...cardChannels.map((key) => words[key])];
  const reveal = input.detail !== "brief" && (input.maskedNumber || input.cvv) ? words.reveal : undefined;
  return [
    network,
    last4,
    expires,
    ...controls,
    cap,
    reveal,
    state === "success" ? words.updated : undefined,
  ].filter((line): line is string => line !== undefined);
}
