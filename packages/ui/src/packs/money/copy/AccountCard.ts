import { compactMoneyLine, moneyLine, type AppCurrency } from "../../../catalog";
import { moneyWordsFor, type MoneyWords } from "../lang";

type Account = {
  id?: string;
  name: string;
  kind: keyof MoneyWords["accountKinds"];
  last4?: string | undefined;
  balance: number;
  creditLimit?: number | undefined;
  rewardsValue?: number | undefined;
};

export function accountCopy(
  account: Account,
  lang?: string,
  words = moneyWordsFor(lang),
  currency?: AppCurrency,
) {
  const kind = words.accountKinds[account.kind];
  const exact = moneyLine(account.balance, currency, undefined, lang);
  const balance = exact.length > 11 ? compactMoneyLine(account.balance, currency, lang) : exact;
  const extras = [
    ["credit_limit", account.creditLimit, words.accountCreditLimit],
    ["rewards_value", account.rewardsValue, words.accountRewardsValue],
  ] as const;
  const details = extras.flatMap(([part, value, label]) => {
    if (value === undefined) return [];
    const amount = compactMoneyLine(value, currency, lang);
    return [{ part, label, amount, text: words.accountDetail(label, amount) }];
  });
  return {
    kind,
    suffix: account.last4 === undefined ? undefined : words.accountSuffix(account.last4),
    exact,
    balance,
    details,
    label: [
      words.accountLabel(account.name, kind, exact, account.last4),
      ...details.map(({ text }) => text),
    ].join(", "),
  };
}

export function accountReading(
  accounts: readonly Account[],
  lang?: string,
  currency?: AppCurrency,
): string[] {
  return accounts.map((account) => {
    const { kind, suffix, balance, exact, details } = accountCopy(account, lang, undefined, currency);
    const visible = `${kind}${suffix ?? ""} ${balance}`;
    const line = [
      balance === exact ? visible : `${visible} (${exact})`,
      ...details.map(({ text }) => text),
    ].join(" · ");
    return account.id ? `${account.id} ${line}` : line;
  });
}
