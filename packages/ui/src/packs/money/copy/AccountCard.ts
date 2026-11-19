import { compactMoneyLine, moneyLine } from "../../../catalog";
import { moneyWordsFor, type MoneyWords } from "../lang";

type Account = {
  id?: string;
  name: string;
  kind: keyof MoneyWords["accountKinds"];
  last4?: string | undefined;
  balance: number;
};

export function accountCopy(account: Account, lang?: string, words = moneyWordsFor(lang)) {
  const kind = words.accountKinds[account.kind];
  const exact = moneyLine(account.balance, undefined, undefined, lang);
  const balance = exact.length > 11 ? compactMoneyLine(account.balance, undefined, lang) : exact;
  return {
    kind,
    suffix: account.last4 === undefined ? undefined : words.accountSuffix(account.last4),
    exact,
    balance,
    label: words.accountLabel(account.name, kind, exact, account.last4),
  };
}

export function accountReading(accounts: readonly Account[], lang?: string): string[] {
  return accounts.map((account) => {
    const { kind, suffix, balance, exact } = accountCopy(account, lang);
    const visible = `${kind}${suffix ?? ""} ${balance}`;
    const line = balance === exact ? visible : `${visible} (${exact})`;
    return account.id ? `${account.id} ${line}` : line;
  });
}
