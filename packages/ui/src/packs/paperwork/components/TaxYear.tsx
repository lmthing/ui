import { z } from "zod";
import * as c from "../../../catalog";
import { seedDate, seedRows } from "../seeds";

// Core first: Checklist/default ticks jobs but cannot match required evidence against files and reviewed receipts.
export const meta = {
  id: "TaxYear",
  status: "draft",
  group: "data",
  purpose: "Find missing tax evidence by matching records to one filing period.",
  pick: "Completeness of tax evidence for one specified period, computed from linked documents and reviewed receipts. Not manually ticking off jobs (Checklist), money movements (Transactions), client bills (Invoice) or arbitrary data rows (Table).",
  writeHints: [
    "Write from and to in YYYY-MM-DD, in ascending order. Omit due unless supplied; never infer statutory dates.",
    'Each requirement asks for "documents" or "receipts" using a tag and a needed count. Do not write matches, totals, tax owed, or filed status.',
    "Use compact density for tighter summary rows, retaining all category links. Leave density and surface null otherwise.",
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath:
    "The device matches linked documents and reviewed receipts with usable files to period requirements; tax rules, filing and advice stay outside the app.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "plain"] },
  parts: ["root", "label", "from", "to", "due", "receipt_total", "allocation_total", "empty", "success"],
  items: { key: "requirements", parts: ["root", "label", "meta", "matched", "needed", "missing"] },
  states: ["filled", "empty", "loading", "success"],
  emptyActions: ["root.press"],
  successActions: ["root.press"],
  readSuccess: true,
  actions: { items: { root: ["press"] } },
  read: (input): string[] => {
    const { from, to, due } = input as z.output<typeof props>;
    return due ? [from, to, due] : [from, to];
  },
} as const satisfies c.Meta;

const requirement = z.strictObject({
  label: c.text(32),
  source: z.enum(["documents", "receipts"]),
  tag: c.text(16),
  needed: z.int().min(1).max(12),
  goto: c.screenId.optional(),
});

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    label: c.text(24),
    from: c.isoDate,
    to: c.isoDate,
    due: c.isoDate.optional(),
    requirements: z.array(requirement).min(1).max(8),
  })
  .refine(({ from, to }) => from <= to, {
    path: ["to"],
    message: "End date must be on or after start date",
  });

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  const rows = seedRows(input, 32, 16);
  return {
    label: c.clip(rows[0]!.title, 24),
    from: seedDate,
    to: seedDate,
    requirements: rows.map(({ title, detail }) => ({
      label: title,
      source: "documents",
      tag: detail,
      needed: 1,
    })),
  };
}

export const examples = [
  {
    label: "Ledge archive 2026",
    from: "2026-01-01",
    to: "2026-12-31",
    due: "2027-02-15",
    requirements: [
      { label: "Greenhouse permits", source: "documents", tag: "permits", needed: 1, goto: "permits" },
      { label: "Pot purchase proof", source: "receipts", tag: "pots", needed: 3, goto: "pots" },
    ],
  },
  {
    label: "Trot tax evidence",
    from: "2026-04-06",
    to: "2027-04-05",
    density: "compact",
    surface: "plain",
    requirements: [
      { label: "Account statements", source: "documents", tag: "statements", needed: 12, goto: "vault" },
      { label: "Expense evidence", source: "receipts", tag: "expenses", needed: 6, goto: "tax_receipts" },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("TaxYear");
export const probes = [
  choose(
    "For my filing period, match the attached documents and reviewed receipts I've collected to each required category and tell me which evidence is missing.",
  ),
  choose(
    "Give me independent tasks I can tick by hand: tidy the folder, call the accountant, and make a backup. No matches or files.",
    "Checklist",
  ),
  write(
    "Call this Ledge archive 2026, from 2026-01-01 to 2026-12-31. Require one Greenhouse permits document tagged permits and three Pot purchase proof receipts tagged pots.",
  ),
  {
    ...write(
      "Show Ledge archive 2026 from 2026-01-01 to 2026-12-31. Require one Greenhouse permits document tagged permits and three Pot purchase proof receipts tagged pots. Use tighter summary rows so more categories fit, keeping each evidence link.",
    ),
    variant: { axis: "density", value: "compact" },
  },
  read("Open the evidence for Pot purchase proof.", { address: "t1/r2", action: "press" }),
] satisfies c.Probe[];
