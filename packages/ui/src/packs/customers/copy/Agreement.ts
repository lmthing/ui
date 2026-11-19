import { customersWordsFor } from "../lang";
export const { agreementLabels } = customersWordsFor();

/** Keep the stored signing date visible without inventing a date for an unsigned record. */
export const agreementDateLine = (date: string, lang?: string): string =>
  customersWordsFor(lang).signed(date);
