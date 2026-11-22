import { words as ExpensesWords } from "./en/Expenses";
import { words as ProfitLossWords } from "./en/ProfitLoss";
import { words as VatReturnWords } from "./en/VatReturn";
import { words as LedgerWords } from "./en/Ledger";
import { words as PayrollWords } from "./en/Payroll";
export const en = {
  ...ExpensesWords,
  ...ProfitLossWords,
  ...VatReturnWords,
  ...LedgerWords,
  ...PayrollWords,
};

export type BooksWords = typeof en;
