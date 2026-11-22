import { words as TaxYearWords } from "./en/TaxYear";
import { words as ReceiptsWords } from "./en/Receipts";
import { words as RenewalsWords } from "./en/Renewals";
import { words as DocumentsWords } from "./en/Documents";
export const en = {
  ...TaxYearWords,
  ...ReceiptsWords,
  ...RenewalsWords,
  ...DocumentsWords,
};

export type PaperworkWords = typeof en;
