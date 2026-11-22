export function boxScoreTotals(periods: readonly { home: number; away: number }[]) {
  return periods.reduce(
    (total, period) => ({ home: total.home + period.home, away: total.away + period.away }),
    { home: 0, away: 0 },
  );
}
