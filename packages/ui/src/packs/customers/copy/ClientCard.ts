import { customersWordsFor } from "../lang";
import { appointmentDate, compactMoneyLine } from "../../../catalog";

export const { contactLabels } = customersWordsFor();
export const sinceLine = (date: string, lang?: string): string =>
  customersWordsFor(lang).since(appointmentDate(date, lang));
export const nextLine = (next: string, lang?: string): string => customersWordsFor(lang).next(next);
export const tagsLine = (tags: readonly string[]): string => tags.join(" · ");

export function clientBalanceLine(
  { charged, paid }: { charged: number; paid: number },
  lang?: string,
): string {
  const words = customersWordsFor(lang).clientBalance;
  const balance = charged - paid;
  if (Math.abs(balance) < 0.005) return words.settled;
  const amount = compactMoneyLine(Math.abs(balance), undefined, lang);
  return balance > 0 ? words.due(amount) : words.credit(amount);
}

export function clientReading(
  {
    company,
    billing,
    since,
    next,
    tags,
    phone,
    address,
    email,
  }: {
    company?: string | undefined;
    billing?: Parameters<typeof clientBalanceLine>[0] | undefined;
    since?: string | undefined;
    next?: string | undefined;
    tags: readonly string[];
    phone: boolean;
    address: boolean;
    email?: boolean | undefined;
  },
  lang?: string,
): string[] {
  const { contactLabels } = customersWordsFor(lang);
  return [
    ...(company ? [company] : []),
    ...(billing ? [clientBalanceLine(billing, lang)] : []),
    ...(since ? [sinceLine(since, lang)] : []),
    ...(next ? [nextLine(next, lang)] : []),
    ...(tags.length ? [tagsLine(tags)] : []),
    contactLabels.message,
    ...(phone ? [contactLabels.call] : []),
    ...(address ? [contactLabels.directions] : []),
    ...(email ? [contactLabels.email] : []),
  ];
}
