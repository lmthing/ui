import { words as AgreementWords } from "./en/Agreement";
import { words as ClientCardWords } from "./en/ClientCard";
import { words as PaymentStatusWords } from "./en/PaymentStatus";
import { words as InvoiceWords } from "./en/Invoice";
import { words as FollowUpQueueWords } from "./en/FollowUpQueue";
import { words as SavedItemsWords } from "./en/SavedItems";
export const en = {
  ...AgreementWords,
  ...ClientCardWords,
  ...PaymentStatusWords,
  ...InvoiceWords,
  ...FollowUpQueueWords,
  ...SavedItemsWords,
};

export type CustomersWords = typeof en;
