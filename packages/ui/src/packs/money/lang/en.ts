import { words as AmountPadWords } from "./en/AmountPad";
import { words as BillsWords } from "./en/Bills";
import { words as AccountCardWords } from "./en/AccountCard";
import { words as packWords } from "./en/pack";
import { words as CardControlsWords } from "./en/CardControls";
import { words as MoneyTransferWords } from "./en/MoneyTransfer";
import { words as CreditScoreWords } from "./en/CreditScore";
import { words as LoanWords } from "./en/Loan";
import { words as PriceChartWords } from "./en/PriceChart";
import { words as PayoffWords } from "./en/Payoff";
import { words as SplitWords } from "./en/Split";
import { words as TransactionsWords } from "./en/Transactions";
export const en = {
  ...AmountPadWords,
  ...BillsWords,
  ...AccountCardWords,
  ...packWords,
  ...CardControlsWords,
  ...MoneyTransferWords,
  ...CreditScoreWords,
  ...LoanWords,
  ...PriceChartWords,
  ...PayoffWords,
  ...SplitWords,
  ...TransactionsWords,
};

export type MoneyWords = typeof en;
