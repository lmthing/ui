import { appointmentDate, documentFieldLine } from "../../../catalog";
import { commerceWordsFor } from "../lang";

export function promoExpiry(ends: string, lang?: string): string {
  return documentFieldLine(commerceWordsFor(lang).promoEnds, appointmentDate(ends, lang), lang);
}
