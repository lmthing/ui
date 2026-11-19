import { customersWordsFor } from "../lang";
import { appointmentDate } from "../../../catalog";

export const { contactLabels } = customersWordsFor();
export const sinceLine = (date: string, lang?: string): string =>
  customersWordsFor(lang).since(appointmentDate(date, lang));
export const nextLine = (next: string, lang?: string): string => customersWordsFor(lang).next(next);
export const tagsLine = (tags: readonly string[]): string => tags.join(" · ");

export function clientReading(
  {
    since,
    next,
    tags,
    phone,
    address,
  }: {
    since?: string | undefined;
    next?: string | undefined;
    tags: readonly string[];
    phone: boolean;
    address: boolean;
  },
  lang?: string,
): string[] {
  const { contactLabels } = customersWordsFor(lang);
  return [
    ...(since ? [sinceLine(since, lang)] : []),
    ...(next ? [nextLine(next, lang)] : []),
    ...(tags.length ? [tagsLine(tags)] : []),
    contactLabels.message,
    ...(phone ? [contactLabels.call] : []),
    ...(address ? [contactLabels.directions] : []),
  ];
}
