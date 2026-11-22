import { words as InvestmentActivityWords } from "./en/InvestmentActivity";
import { words as DividendsWords } from "./en/Dividends";
import { words as PerformanceWords } from "./en/Performance";
import { words as HoldingsWords } from "./en/Holdings";
import { words as WatchlistWords } from "./en/Watchlist";
export const en = {
  ...InvestmentActivityWords,
  ...DividendsWords,
  ...PerformanceWords,
  ...HoldingsWords,
  ...WatchlistWords,
};

export type InvestWords = typeof en;
