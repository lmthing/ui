import { decimal, mul, negative, sub, zero, type Decimal } from "./decimal";
import { replay, type Event } from "./replay";
import {
  invalid,
  latestReceipt,
  ledgerOperation,
  ordered,
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
  now: number;
};
type Draft = Omit<History, "events" | "now"> & { voids: ReadonlyMap<string, string> };

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

function eventsOf({ portfolio, receipts, frozen, voids }: Draft): Event[] {
  const dividends = new Map(portfolio.distributions.map((d) => [d.id, d]));
  return [
    ...portfolio.entries.map((e) => (voids.has(e.id) ? { ...e, voided: true } : e)),
    ...receipts.map(({ id, at, reversedAt }) => ({
      id,
      at,
      kind: "dividend" as const,
      amount: distributionCash(dividends.get(id)!, frozen.get(id)!).net,
      voided: reversedAt !== undefined,
    })),
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
    eventsOf(draft),
    pending.map((d) => time(d.entitledAt)),
    false,
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
    if (entry.voided || draft.voids.has(op.id)) return valid(draft);
    return valid({ ...draft, voids: new Map(draft.voids).set(op.id, op.at) });
  }
  const distribution = draft.portfolio.distributions.find((d) => d.id === op.id);
  if (!distribution) return invalid("Unknown distribution");
  const last = latestReceipt(draft.receipts, op.id);
  if (op.kind === "reverse") {
    if (!last || last.revision < op.revision || time(op.at) < time(last.at))
      return invalid("No matching receipt to reverse");
    if (last.revision > op.revision || last.reversedAt !== undefined) return valid(draft);
    const receipts = draft.receipts.map((r) => (r === last ? { ...r, reversedAt: op.at } : r));
    return valid({ ...draft, receipts });
  }
  const revision = last?.revision ?? 0;
  if (op.revision <= revision) return valid(draft);
  if (op.revision !== revision + 1 || (last && !last.reversedAt))
    return invalid("A receipt is already active or the revision is invalid");
  const units = draft.frozen.get(op.id);
  if (!units || time(op.at) < time(distribution.entitledAt)) return invalid("Entitlement is not known");
  if (op.at.slice(0, 10) < distribution.payOn) return invalid("Receipt precedes the payment day");
  if (negative(distributionCash(distribution, units).net)) return invalid("Withholding exceeds gross");
  const receipt = { id: op.id, at: op.at, revision: op.revision };
  return valid({ ...draft, receipts: [...draft.receipts, receipt] });
}

function applyOperation(draft: Draft, op: LedgerOperation, checkSuffix: boolean) {
  const entitled = atEntitlement(draft, time(op.at));
  if (!entitled.ok) return entitled;
  const candidate = stage({ ...draft, frozen: entitled.value }, op);
  if (!candidate.ok || !checkSuffix) return candidate;
  const checked = replay(draft.portfolio, eventsOf(candidate.value), []);
  return checked.ok ? candidate : checked;
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
  const seeds = portfolio.distributions.flatMap(({ id, receivedAt }) =>
    receivedAt ? [{ kind: "receive" as const, id, at: receivedAt, revision: 1 }] : [],
  );
  let draft: Draft = { portfolio, receipts: [], frozen: new Map(), voids: new Map() };
  let prior = time(portfolio.since);
  for (const [index, raw] of [...ordered(seeds), ...operations].entries()) {
    const op = ledgerOperation.safeParse(raw);
    if (!op.success) return invalid("Malformed ledger operation");
    const at = time(op.data.at);
    if (at < prior || at > now) return invalid("Ledger operation is out of chronological order");
    const next = applyOperation(draft, op.data, index >= seeds.length);
    if (!next.ok) return next;
    draft = next.value;
    prior = at;
  }
  const frozen = atEntitlement(draft, now);
  if (!frozen.ok) return frozen;
  const events = eventsOf(draft);
  const validated = replay(portfolio, events, []);
  return validated.ok
    ? valid({ portfolio, receipts: draft.receipts, frozen: frozen.value, events, now })
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
  const last = latestReceipt(current.value.receipts, op.id);
  const manual = current.value.events.find((e) => e.kind !== "dividend" && e.id === op.id);
  if (
    (op.kind === "void" && manual?.voided) ||
    (op.kind === "receive" && last && op.revision <= last.revision) ||
    (op.kind === "reverse" &&
      last &&
      (op.revision < last.revision || (op.revision === last.revision && last.reversedAt)))
  )
    return valid(undefined);
  const candidate = buildHistory(input, [...journal, op], now);
  return candidate.ok ? valid(op) : candidate;
}
