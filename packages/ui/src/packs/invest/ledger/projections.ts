import { add, decimal, div, mul, negative, numeric, positive, sub } from "./decimal";
import { distributionCash, type History } from "./history";
import { cashMovement, replay, type Balance } from "./replay";
import { invalid, latestReceipt, ordered, time, valid, type Sample } from "./records";

const row = (index: number) => `r${index + 1}`;
const ownedUnits = ({ owned }: Balance) =>
  Object.fromEntries([...owned].map(([asset, { units }]) => [asset, numeric(units)]));

export function holdings(history: History, asset?: string) {
  const { portfolio, events, now } = history;
  const replayed = replay(portfolio, events, [now]);
  if (!replayed.ok) return replayed;
  const { owned, cash } = replayed.value.get(now)!;
  const latest = new Map<string, (typeof portfolio.quotes)[number]>();
  for (const quote of portfolio.quotes) {
    const prior = latest.get(quote.assetId);
    if (time(quote.quotedAt) <= now && (!prior || time(quote.quotedAt) > time(prior.quotedAt)))
      latest.set(quote.assetId, quote);
  }
  let total = cash;
  const positions = portfolio.positions.flatMap(
    ({ units: _units, unitCost: _unitCost, ...instrument }, i) => {
      const { assetId } = instrument;
      const { units, cost } = owned.get(assetId)!;
      if (!positive(units)) return [];
      const quote = latest.get(assetId);
      const value = quote && mul(units, decimal(quote.price));
      if (value) total = add(total, value);
      return [
        {
          ...instrument,
          id: row(i),
          units: numeric(units),
          unitCost: numeric(div(cost, units)),
          costBasis: numeric(cost),
          price: quote?.price,
          quotedAt: quote?.quotedAt,
          value: value ? numeric(value) : null,
          gain: value ? numeric(sub(value, cost)) : null,
        },
      ];
    },
  );
  return valid({
    positions: asset ? positions.filter((p) => p.assetId === asset) : positions,
    cash: numeric(cash),
    totalValue: positions.every((p) => p.value !== null) ? numeric(total) : null,
  });
}

function valueAt(balance: Balance, sample: Sample) {
  const prices = new Map(sample.quotes.map((q) => [q.assetId, q.price]));
  const missing: string[] = [];
  let value = balance.cash;
  for (const [asset, { units }] of balance.owned) {
    if (!positive(units)) continue;
    const price = prices.get(asset);
    if (price === undefined) missing.push(asset);
    else value = add(value, mul(units, decimal(price)));
  }
  return {
    cash: numeric(balance.cash),
    units: ownedUnits(balance),
    contributed: numeric(balance.contributed),
    value: missing.length ? null : numeric(value),
    gain: missing.length ? null : numeric(sub(value, balance.contributed)),
    missing,
  };
}

export function performance(history: History, samples: readonly Sample[]) {
  const { portfolio, events, now } = history;
  const assets = new Set(portfolio.positions.map((p) => p.assetId));
  const times = samples.map((sample) => time(sample.at));
  if (
    times.some(
      (at, index) => at < time(portfolio.since) || at > now || (index > 0 && at <= times[index - 1]!),
    )
  )
    return invalid("Samples must be unique and ordered within the statement");
  if (
    samples.some(
      ({ quotes }) =>
        new Set(quotes.map((q) => q.assetId)).size !== quotes.length ||
        quotes.some((q) => !assets.has(q.assetId)),
    )
  )
    return invalid("Duplicate or unknown sample quote");
  const replayed = replay(portfolio, events, times);
  if (!replayed.ok) return replayed;
  return valid(
    samples.map((sample, index) => ({
      id: row(index),
      at: sample.at,
      ...valueAt(replayed.value.get(times[index]!)!, sample),
    })),
  );
}

export function dividends(history: History) {
  return history.portfolio.distributions.map(({ receivedAt: _receivedAt, ...distribution }, index) => {
    const frozen = history.frozen.get(distribution.id);
    const amounts = frozen && distributionCash(distribution, frozen);
    const last = latestReceipt(history.receipts, distribution.id);
    const active = last?.reversedAt ? undefined : last;
    return {
      ...distribution,
      id: row(index),
      recordId: distribution.id,
      entitledUnits: frozen ? numeric(frozen) : null,
      gross: amounts ? numeric(amounts.gross) : null,
      net: amounts && !negative(amounts.net) ? numeric(amounts.net) : null,
      receivedAt: active?.at,
      revision: last?.revision ?? 0,
      canReceive: Boolean(
        !active &&
        amounts &&
        !negative(amounts.net) &&
        new Date(history.now).toISOString().slice(0, 10) >= distribution.payOn,
      ),
      canReverse: Boolean(active),
    };
  });
}

export function activity(history: History) {
  const entries = history.events.map((event, index) => {
    const movement = numeric(cashMovement(event));
    const id = row(index);
    const appliedCash = event.voided ? 0 : movement;
    const shared = {
      at: event.at,
      id,
      recordId: event.id,
      movement,
      appliedCash,
      voided: Boolean(event.voided),
    };
    if (event.kind === "dividend") {
      const receipt = history.receipts[index - history.portfolio.entries.length]!;
      const distribution = history.portfolio.distributions.find((d) => d.id === event.id)!;
      return {
        ...shared,
        kind: event.kind,
        assetId: distribution.assetId,
        revision: receipt.revision,
        goto: distribution.goto,
        canVoid: false,
        reversedAt: receipt.reversedAt,
      };
    }
    return { ...event, ...shared, canVoid: !event.voided };
  });
  return ordered(entries);
}
