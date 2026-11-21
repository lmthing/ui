import {
  compactMoneyLine,
  moneyLine,
  numberLine,
  type AppCurrency,
  type DeviceData,
  type StateName,
  type Values,
} from "../../../catalog";
import { moneyWordsFor } from "../lang";
import { amountPadKeys } from "./AmountPad";

export const transferModes = ["send", "request"] as const;
export const transferTabs = ["transfer", "qr"] as const;
export const transferSpeeds = ["standard", "instant"] as const;

export function transferChoices(choices: Record<string, string>) {
  return Object.entries(choices).map(([value, label]) => ({ value, label }));
}

type TransferSource = { label: string; last4?: string | undefined; balance?: number | undefined };
export type TransferInput = {
  mode: (typeof transferModes)[number];
  style: (typeof transferTabs)[number];
  speed: (typeof transferSpeeds)[number];
  recipient: { name: string; handle?: string | undefined };
  sources: readonly TransferSource[];
  sourceAt: number;
  draft: string;
  memo?: string | undefined;
  instantFee?: number | undefined;
  qrPayload?: string | undefined;
  detail: "full" | "brief";
};

function transferTotals({ draft, mode, sourceAt, sources, speed, instantFee }: TransferInput) {
  const amount = Number(draft) || 0;
  const sending = mode === "send";
  const fee = sending && speed === "instant" ? (instantFee ?? 0) : 0;
  const total = (Math.round(amount * 100) + Math.round(fee * 100)) / 100;
  const balance = sources[sourceAt]?.balance;
  const insufficient = sending && amount > 0 && balance !== undefined && total > balance;
  return { amount, fee, total, insufficient, ready: amount > 0 && !insufficient };
}

/** Use the same gate for agent actions and the visible submit control. */
export function projectTransfer(input: Readonly<Values>, instance?: string, data?: DeviceData) {
  const value = input as TransferInput;
  const { style, detail } = value;
  const memo = style === "transfer" && detail === "full" ? value.memo : undefined;
  return {
    ready: transferTotals(value).ready,
    memo,
    scannerReady: data?.transferScanner?.includes(instance) ?? false,
  };
}

export function transferSources(sources: readonly TransferSource[], lang?: string) {
  const { accountSuffix, transfer } = moneyWordsFor(lang);
  const labels = sources.map(({ label, last4 }) => label + (last4 ? accountSuffix(last4) : ""));
  const unique = new Set(labels).size === labels.length;
  return labels.map((label, value) => ({
    value,
    label: unique ? label : transfer.sourceNumber(numberLine(value + 1, lang), label),
  }));
}

export function transferCopy(input: TransferInput, state: StateName, lang?: string, currency?: AppCurrency) {
  const { transfer: words, amountPad } = moneyWordsFor(lang);
  const { amount, fee, total, insufficient, ready } = transferTotals(input);
  return {
    words,
    ready,
    recipient: words[input.mode === "send" ? "to" : "from"](input.recipient.name),
    funding: input.mode === "send" ? words.funding : words.deposit,
    sources: transferSources(input.sources, lang),
    amount: moneyLine(amount, currency, undefined, lang, "fixed"),
    empty: state !== "loading" && !amount,
    keys: amountPadKeys(amountPad, Boolean(input.draft)),
    fee: moneyLine(fee, currency, undefined, lang),
    total: amount > 0 ? moneyLine(total, currency, undefined, lang) : undefined,
    balance: input.sources[input.sourceAt]?.balance,
    balanceLine: (value: number) => compactMoneyLine(value, currency, lang),
    status:
      state === "success"
        ? words.success[input.mode]
        : insufficient
          ? words.insufficient
          : state === "error"
            ? words.error
            : undefined,
  };
}

export function transferReading(
  input: TransferInput,
  state: StateName,
  lang?: string,
  currency?: AppCurrency,
): string[] {
  if (state === "loading") return [];
  const { transfer: words } = moneyWordsFor(lang);
  if (state === "empty") return [input.style === "qr" ? words.noCode : words.empty];
  const tabs = Object.values(words.tabs);
  if (input.style === "qr" && state !== "success" && state !== "error")
    return [...tabs, input.qrPayload ? words.code : words.noCode, words.scan];
  const copy = transferCopy(input, state, lang, currency);
  if (state === "success") return [copy.recipient, copy.status!];
  if (state === "error") return [copy.status!];
  return [
    ...tabs,
    ...Object.values(words.modes),
    copy.recipient,
    input.recipient.handle ?? "",
    copy.funding,
    ...copy.sources.map(({ label }) => label),
    ...(copy.balance === undefined ? [] : [copy.balanceLine(copy.balance)]),
    ...(copy.empty ? [words.empty] : []),
    words.amount,
    copy.amount,
    copy.keys.map(({ label }) => label).join(" "),
    ...(input.detail === "full" ? [words.memo, input.memo ?? ""] : []),
    ...(input.mode === "send"
      ? [words.speed, ...Object.values(words.speeds), words.summary(words.fee, copy.fee)]
      : []),
    ...(copy.total ? [words.summary(words.total, copy.total)] : []),
    ...(copy.status ? [copy.status] : []),
    words.submit[input.mode],
  ].filter(Boolean);
}
