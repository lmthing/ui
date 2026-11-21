import {
  invalid,
  ledgerOperation,
  ordered,
  time,
  valid,
  type LedgerOperation,
  type Portfolio,
} from "./records";

const keyOf = (op: LedgerOperation) => `${op.kind}/${op.id}/${"revision" in op ? op.revision : ""}`;
export const matchingTime = (a: LedgerOperation, b: LedgerOperation) => time(a.at) === time(b.at);

export function existingOperation(operations: ReadonlyMap<string, LedgerOperation>, op: LedgerOperation) {
  return operations.get(keyOf(op));
}

/** Host receipts merge chronologically with new local operations; retries keep the original slot. */
export function collectOperations(portfolio: Portfolio, journal: readonly unknown[], now: number) {
  const operations = new Map<string, LedgerOperation>();
  for (const { id, receivedAt } of portfolio.distributions) {
    if (!receivedAt) continue;
    const op = { kind: "receive", id, at: receivedAt, revision: 1 } as const;
    if (time(op.at) < time(portfolio.since) || time(op.at) > now) return invalid("Invalid host receipt time");
    operations.set(keyOf(op), op);
  }
  let prior = time(portfolio.since);
  for (const raw of journal) {
    const parsed = ledgerOperation.safeParse(raw);
    if (!parsed.success) return invalid("Malformed ledger operation");
    const op = parsed.data;
    const existing = existingOperation(operations, op);
    if (existing) {
      if (!matchingTime(existing, op)) return invalid("Conflicting ledger operation");
      continue;
    }
    const at = time(op.at);
    if (at < prior || at > now) return invalid("Ledger operation is out of chronological order");
    operations.set(keyOf(op), op);
    prior = at;
  }
  return valid({ operations, timeline: ordered([...operations.values()]) });
}
