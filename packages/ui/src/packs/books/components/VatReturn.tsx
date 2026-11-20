import { z } from "zod";
import * as c from "../../../catalog";
import { periodFields, ref, seedPeriod, validPeriod } from "../seeds";

// Core first: KeyValue/rows cannot map VAT boxes to reconciled evidence or save a reviewed period.
export const meta = {
  id: "VatReturn",
  status: "draft",
  group: "data",
  purpose: "Review VAT boxes against source records and save a local snapshot.",
  pick: "A local preview of prescribed VAT boxes: output tax, recoverable input tax, and payable or refundable VAT with evidence. Not a short set of arbitrary facts (KeyValue), money set aside (Progress), or taxable profit (ProfitLoss).",
  writeHints: [
    "Write ordered dates spanning at most 366 days and a snake_case schemeRef. Box labels and amounts come from the rule and records, not Writer props.",
    'Use style "reconcile" only to trace box sources and exclusions; otherwise use "boxes". Saving is local, never filing or paying.',
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "A versioned VAT rule computes the local preview; saving never files or pays a return.",
  variants: { density: ["comfortable", "compact"] },
  parts: ["root", "from", "to", "save", "result"],
  items: { key: "boxes", parts: ["root", "number", "label", "value", "sources", "exclusions"] },
  states: ["filled", "empty", "loading", "success", "error"],
  actions: { parts: { save: ["press"] }, items: { root: ["press"] }, when: { root: { linked: true } } },
} as const satisfies c.Meta;

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    ...periodFields,
    schemeRef: ref,
    ledgerGoto: c.screenId.optional(),
    style: z.enum(["boxes", "reconcile"]).default("boxes"),
  })
  .refine(validPeriod, { path: ["to"], message: "Use an ordered period of at most 366 days" });

export function fallback(): z.input<typeof props> {
  return { ...seedPeriod, schemeRef: "item_1" };
}

export const examples = [
  { from: "2026-10-01", to: "2026-12-31", schemeRef: "domestic_cash", ledgerGoto: "care_ledger" },
  {
    from: "2026-07-01",
    to: "2026-09-30",
    schemeRef: "domestic_cash",
    ledgerGoto: "walk_ledger",
    style: "reconcile",
    density: "compact",
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("VatReturn");
export const probes = [
  choose(
    "Preview the quarter's nine numbered VAT boxes, with output tax, recoverable input VAT and the difference due. Save the reviewed snapshot locally.",
  ),
  choose(
    "Show labelled facts about one purchase: its supplier, receipt number and purchase date. No tax period or calculations.",
    "KeyValue",
  ),
  write(
    "Preview the domestic_cash VAT scheme from October 1 through December 31, 2026. Link contributing lines to care_ledger. Use the numbered boxes, not the reconciliation view.",
  ),
  read("Save a reviewed local VAT snapshot.", { address: "v1/save", action: "press" }),
] satisfies c.Probe[];
