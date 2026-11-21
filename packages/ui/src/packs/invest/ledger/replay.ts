import { add, decimal, div, mul, negative, sub, zero, type Decimal } from "./decimal";
import { invalid, ordered, time, valid, type LedgerResult, type Manual, type Portfolio } from "./records";

export type Balance = {
  cash: Decimal;
  contributed: Decimal;
  owned: ReadonlyMap<string, { units: Decimal; cost: Decimal }>;
};
export type Event = Manual | { kind: "dividend"; id: string; at: string; amount: Decimal; voided: boolean };

export function cashMovement(event: Event): Decimal {
  if (event.kind === "dividend") return event.amount;
  if ("amount" in event) {
    const amount = decimal(event.amount);
    return event.kind === "deposit" ? amount : sub(zero, amount);
  }
  const principal = mul(decimal(event.units), decimal(event.unitPrice));
  const fee = decimal(event.fee ?? 0);
  return sub(event.kind === "sell" ? principal : sub(zero, principal), fee);
}

function apply(balance: Balance, event: Event): LedgerResult<Balance> {
  if (event.voided) return valid(balance);
  const movement = cashMovement(event);
  const cash = add(balance.cash, movement);
  if (negative(cash)) return invalid(`Negative cash after ${event.id}`);
  if (event.kind === "deposit" || event.kind === "withdrawal")
    return valid({ ...balance, cash, contributed: add(balance.contributed, movement) });
  if (!("assetId" in event)) return valid({ ...balance, cash });
  const position = balance.owned.get(event.assetId);
  if (!position) return invalid(`Unknown instrument ${event.assetId}`);
  const delta = decimal(event.units);
  const buying = event.kind === "buy";
  const units = buying ? add(position.units, delta) : sub(position.units, delta);
  if (negative(units)) return invalid(`Sale exceeds units after ${event.id}`);
  const cost = buying ? sub(position.cost, movement) : mul(position.cost, div(units, position.units));
  const owned = new Map(balance.owned).set(event.assetId, { units, cost });
  return valid({ ...balance, cash, owned });
}

/** Checkpoints include all entries at their timestamp. Validation also checks the remaining suffix. */
export function replay(
  portfolio: Portfolio,
  events: readonly Event[],
  checkpoints: readonly number[],
  validateSuffix = true,
) {
  let balance: Balance = {
    cash: decimal(portfolio.openingCash),
    contributed: decimal(portfolio.openingContributed),
    owned: new Map(
      portfolio.positions.map(({ assetId, units, unitCost }) => [
        assetId,
        { units: decimal(units), cost: mul(decimal(units), decimal(unitCost)) },
      ]),
    ),
  };
  const snapshots = new Map<number, Balance>();
  const sorted = ordered(events);
  let index = 0;
  const times = [...new Set(checkpoints)].sort((a, b) => a - b);
  if (validateSuffix) times.push(Infinity);
  for (const at of times) {
    while (index < sorted.length && time(sorted[index]!.at) <= at) {
      const result = apply(balance, sorted[index++]!);
      if (!result.ok) return result;
      balance = result.value;
    }
    if (at !== Infinity) snapshots.set(at, balance);
  }
  return valid(snapshots);
}
