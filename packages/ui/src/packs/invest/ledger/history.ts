import { decimal, mul, negative, sub, zero, type Decimal } from "./decimal";
import { collectOperations, existingOperation, matchingTime } from "./journal";
import { replay, type Event } from "./replay";
import {
  invalid,
  latestReceipt,
  ledgerDay,
  ledgerOperation,
  portfolioRecord,
  time,
  valid,
  type Distribution,
  type LedgerOperation,
  type LedgerResult,
  type Portfolio,
  type Receipt,
} from "./records";

export type History = {
  portfolio: Portfolio;
  events: readonly Event[];
  receipts: readonly Receipt[];
  frozen: ReadonlyMap<string, Decimal>;
  operations: ReadonlyMap<string, LedgerOperation>;
  now: number;
};
type Draft = Omit<History, "events" | "now" | "operations"> & { voids: ReadonlySet<string> };

function unique<T>(rows: readonly T[], key: (row: T) => string) {
  return new Set(rows.map(key)).size === rows.length;
}

function validateSeed(portfolio: Portfolio, now: number) {
  const { positions, entries, distributions, quotes, since } = portfolio;
  if (time(since) > now) return "Opening statement is in the future";
  if (!unique(positions, (p) => p.assetId) || !unique([...entries, ...distributions], (r) => r.id))
    return "Duplicate ledger record";
  const assets = new Set(positions.map((p) => p.assetId));
  const outOfBounds = (at: string) => time(at) < time(since) || time(at) > now;
  if (entries.some((e) => outOfBounds(e.at))) return "Trade or cash entry is outside the statement";
  if (entries.some((e) => "assetId" in e && !assets.has(e.assetId))) return "Unknown trade instrument";
  if (distributions.some((d) => !assets.has(d.assetId))) return "Unknown dividend instrument";
  const seen = new Map<string, number>();
  for (const quote of quotes) {
    if (!assets.has(quote.assetId)) return "Unknown quote instrument";
    const key = `${quote.assetId}/${time(quote.quotedAt)}`;
    if (seen.has(key) && seen.get(key) !== quote.price) return "Conflicting quotes at the same time";
    seen.set(key, quote.price);
  }
}

export function distributionCash(distribution: Distribution, units: Decimal) {
  const gross = mul(units, decimal(distribution.perUnit));
  return { gross, net: sub(gross, decimal(distribution.withheld ?? 0)) };
}

const manualEvents = ({ portfolio, voids }: Draft) =>
  portfolio.entries.map((e) => (voids.has(e.id) ? { ...e, voided: true } : e));

function eventsOf(draft: Draft): Event[] {
  const { portfolio, receipts, frozen } = draft;
  const dividends = new Map(portfolio.distributions.map((d) => [d.id, d]));
  return [
    ...manualEvents(draft),
    ...receipts.map(({ id, at, reversedAt }) => {
      const distribution = dividends.get(id)!;
      return {
        id,
        at,
        kind: "dividend" as const,
        amount: distributionCash(distribution, frozen.get(id)!).net,
        voided: reversedAt !== undefined,
        // Already-entitled cash can fund a trade at the same instant.
        beforeTrades: time(distribution.entitledAt) < time(at),
      };
    }),
  ];
}

function atEntitlement(draft: Draft, now: number) {
  const pending = draft.portfolio.distributions.filter(
    (d) =>
      !draft.frozen.has(d.id) &&
      time(d.entitledAt) >= time(draft.portfolio.since) &&
      time(d.entitledAt) <= now,
  );
  const replayed = replay(
    draft.portfolio,
    manualEvents(draft),
    pending.map((d) => time(d.entitledAt)),
    "entitlement",
  );
  if (!replayed.ok) return replayed;
  const frozen = new Map(draft.frozen);
  for (const d of pending) {
    const balance = replayed.value.get(time(d.entitledAt))!;
    frozen.set(d.id, balance.owned.get(d.assetId)?.units ?? zero);
  }
  return valid(frozen);
}

function stage(draft: Draft, op: LedgerOperation): LedgerResult<Draft> {
  if (op.kind === "void") {
    const entry = draft.portfolio.entries.find((e) => e.id === op.id);
    if (!entry || time(entry.at) > time(op.at)) return invalid("No manual entry to void");
    if (entry.voided || draft.voids.has(op.id)) return invalid("Manual entry is already voided");
    return valid({ ...draft, voids: new Set(draft.voids).add(op.id) });
  }
  const distribution = draft.portfolio.distributions.find((d) => d.id === op.id);
  if (!distribution) return invalid("Unknown distribution");
  const last = latestReceipt(draft.receipts, op.id);
  if (op.kind === "reverse") {
    if (!last || last.revision !== op.revision || last.reversedAt || time(op.at) < time(last.at))
      return invalid("No matching receipt to reverse");
    const receipts = draft.receipts.map((r) => (r === last ? { ...r, reversedAt: op.at } : r));
    return valid({ ...draft, receipts });
  }
  const revision = last?.revision ?? 0;
  if (op.revision !== revision + 1 || (last && !last.reversedAt))
    return invalid("A receipt is already active or the revision is invalid");
  const units = draft.frozen.get(op.id);
  if (!units || time(op.at) < time(distribution.entitledAt)) return invalid("Entitlement is not known");
  if (ledgerDay(time(op.at)) < distribution.payOn) return invalid("Receipt precedes the payment day");
  if (negative(distributionCash(distribution, units).net)) return invalid("Withholding exceeds gross");
  const receipt = { id: op.id, at: op.at, revision: op.revision };
  return valid({ ...draft, receipts: [...draft.receipts, receipt] });
}

/** Validate the host snapshot and the ordered journal without changing either. */
export function buildHistory(
  input: unknown,
  operations: readonly unknown[],
  now: number,
): LedgerResult<History> {
  const parsed = portfolioRecord.safeParse(input);
  if (!parsed.success || !Number.isFinite(now) || !Number.isFinite(new Date(now).getTime()))
    return invalid("Invalid portfolio statement or time");
  const portfolio = parsed.data;
  const error = validateSeed(portfolio, now);
  if (error) return invalid(error);
  const journal = collectOperations(portfolio, operations, now);
  if (!journal.ok) return journal;
  let draft: Draft = { portfolio, receipts: [], frozen: new Map(), voids: new Set() };
  for (const op of journal.value.timeline) {
    const entitled = atEntitlement(draft, time(op.at));
    if (!entitled.ok) return entitled;
    const next = stage({ ...draft, frozen: entitled.value }, op);
    if (!next.ok) return next;
    draft = next.value;
  }
  const frozen = atEntitlement(draft, now);
  if (!frozen.ok) return frozen;
  const events = eventsOf(draft);
  const validated = replay(portfolio, events, []);
  return validated.ok
    ? valid({
        portfolio,
        receipts: draft.receipts,
        frozen: frozen.value,
        events,
        now,
        operations: journal.value.operations,
      })
    : validated;
}

/** Retry the same operation without adding a second journal entry, even after a later revision. */
export function planLedgerOperation(
  input: Portfolio,
  journal: readonly unknown[],
  op: LedgerOperation,
  now: number,
) {
  const current = buildHistory(input, journal, now);
  if (!current.ok) return current;
  const parsed = ledgerOperation.safeParse(op);
  if (!parsed.success || time(op.at) > now || time(op.at) < time(input.since))
    return invalid("Invalid ledger operation");
  const previous = existingOperation(current.value.operations, parsed.data);
  if (previous)
    return matchingTime(previous, op) ? valid(undefined) : invalid("Conflicting ledger operation");
  const candidate = buildHistory(input, [...journal, op], now);
  return candidate.ok ? valid(op) : candidate;
}
