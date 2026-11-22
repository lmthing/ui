import { words as FormFillerWords } from "./en/FormFiller";
import { words as ScanBatchWords } from "./en/ScanBatch";
import { words as SignatureWords } from "./en/Signature";
import { words as TaxYearWords } from "./en/TaxYear";
import { words as ReceiptsWords } from "./en/Receipts";
import { words as RenewalsWords } from "./en/Renewals";
import { words as DocumentsWords } from "./en/Documents";
export const en = {
  ...FormFillerWords,
  ...ScanBatchWords,
  ...SignatureWords,
  ...TaxYearWords,
  ...ReceiptsWords,
  ...RenewalsWords,
  ...DocumentsWords,
};

export type PaperworkWords = typeof en;
