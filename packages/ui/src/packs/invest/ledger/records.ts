import { z } from "zod";
import { screenId, text } from "../../../catalog";

const id = z
  .string()
  .max(24)
  .regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/);
const at = z.iso.datetime({ offset: true });
const nonnegative = z.number().nonnegative();
const amount = z.number().positive();
const link = screenId.optional();
const position = z.strictObject({
  assetId: id,
  name: text(32),
  symbol: text(12),
  class: z.enum(["equity", "bond", "fund", "crypto", "other"]),
  units: nonnegative,
  unitCost: nonnegative,
  goto: link,
});
const quote = z.strictObject({ assetId: id, price: nonnegative });
const event = { id, at, voided: z.boolean().optional(), goto: link };
const manual = z.union([
  z.strictObject({ ...event, kind: z.enum(["deposit", "withdrawal", "fee"]), amount }),
  z.strictObject({
    ...event,
    kind: z.enum(["buy", "sell"]),
    assetId: id,
    units: amount,
    unitPrice: nonnegative,
    fee: nonnegative.optional(),
  }),
]);
const distribution = z
  .strictObject({
    id,
    assetId: id,
    entitledAt: at,
    payOn: z.iso.date(),
    perUnit: amount,
    withheld: nonnegative.optional(),
    receivedAt: at.optional(),
    goto: link,
  })
  .refine(({ payOn, entitledAt }) => payOn >= entitledAt.slice(0, 10));

/** The host supplies the complete portfolio, independently of the visible component. */
export const portfolioRecord = z.strictObject({
  portfolioId: id,
  since: at,
  openingCash: nonnegative,
  openingContributed: z.number(),
  positions: z.array(position),
  entries: z.array(manual),
  quotes: z.array(quote.extend({ quotedAt: at })),
  distributions: z.array(distribution),
});
export const performanceSample = z.strictObject({ at, quotes: z.array(quote) });
export const ledgerOperation = z.union([
  z.strictObject({
    kind: z.enum(["receive", "reverse"]),
    id,
    at,
    revision: z.number().int().positive(),
  }),
  z.strictObject({ kind: z.literal("void"), id, at }),
]);

export type Portfolio = z.infer<typeof portfolioRecord>;
export type Sample = z.infer<typeof performanceSample>;
export type Manual = z.infer<typeof manual>;
export type Distribution = z.infer<typeof distribution>;
export type LedgerOperation = z.infer<typeof ledgerOperation>;
export type Receipt = { id: string; revision: number; at: string; reversedAt?: string };
export function latestReceipt(receipts: readonly Receipt[], id: string) {
  for (let i = receipts.length - 1; i >= 0; i--) if (receipts[i]!.id === id) return receipts[i];
}
export const time = (date: string) => Date.parse(date);
export const ordered = <T extends { at: string }>(events: readonly T[]) =>
  [...events].sort((a, b) => time(a.at) - time(b.at));

export type LedgerResult<T> = { ok: true; value: T } | { ok: false; error: string };
export const invalid = (error: string): LedgerResult<never> => ({ ok: false, error });
export const valid = <T>(value: T): LedgerResult<T> => ({ ok: true, value });
