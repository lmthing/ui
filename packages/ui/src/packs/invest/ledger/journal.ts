import {
  invalid,
  ledgerOperation,
  ordered,
  time,
  valid,
  type Distribution,
  type LedgerOperation,
  type Portfolio,
} from "./records";
import type { Decimal } from "./decimal";

const keyOf = (op: LedgerOperation) => `${op.kind}/${op.id}/${"revision" in op ? op.revision : ""}`;
const basisOf = (op: LedgerOperation) => (op.kind === "receive" ? op.basis : undefined);
export const matchingOperation = (a: LedgerOperation, b: LedgerOperation) =>
  time(a.at) === time(b.at) && (!basisOf(a) || !basisOf(b) || basisOf(a) === basisOf(b));

/** Retain the exact inputs to deposited dividend cash, not rounded display amounts. */
export function receiptBasis(d: Distribution, [n, denominator]: Decimal) {
  return JSON.stringify([
    d.assetId,
    time(d.entitledAt),
    d.payOn,
    d.perUnit,
    d.withheld ?? 0,
    `${n}/${denominator}`,
  ]);
}

export function existingOperation(operations: ReadonlyMap<string, LedgerOperation>, op: LedgerOperation) {
  return operations.get(keyOf(op));
}

/** An acknowledged local void remains effective at its journal timestamp. */
export function withJournalVoids(portfolio: Portfolio, timeline: readonly LedgerOperation[]): Portfolio {
  const corrections = new Set(timeline.filter((op) => op.kind === "void").map(({ id }) => id));
  return {
    ...portfolio,
    entries: portfolio.entries.map((e) => (e.voided && corrections.has(e.id) ? { ...e, voided: false } : e)),
  };
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
  const local = new Set<string>();
  for (const raw of journal) {
    const parsed = ledgerOperation.safeParse(raw);
    if (!parsed.success) return invalid("Malformed ledger operation");
    const op = parsed.data;
    if (op.kind === "receive" && !op.basis) return invalid("Missing frozen receipt basis");
    const key = keyOf(op);
    const existing = existingOperation(operations, op);
    if (existing && !matchingOperation(existing, op)) return invalid("Conflicting ledger operation");
    if (local.has(key)) continue;
    const at = time(op.at);
    if (at < prior || at > now) return invalid("Ledger operation is out of chronological order");
    operations.set(key, op);
    local.add(key);
    prior = at;
  }
  return valid({ operations, timeline: ordered([...operations.values()]) });
}
