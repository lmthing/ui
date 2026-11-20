import { z } from "zod";
import * as c from "../../../catalog";
import { dateTime, distinct, ref, seedDate, seedTitle } from "../seeds";

// Core first: Field/number cannot split receipt costs by category, VAT code and business-use fraction.
export const meta = {
  id: "Expenses",
  status: "draft",
  group: "input",
  purpose: "Record business receipts and split their costs for bookkeeping and VAT.",
  pick: "Receipt-backed business costs split into lines with a category, VAT code and business-use fraction. Not one ordinary form value (Field), a photo for a warranty (Warranties), staff approval (Approval), or the entire cash ledger (Ledger).",
  writeHints: [
    'Use style "receipt" for exactly one receipt with editable draft lines; otherwise use "register". A receipt has one to eight splits; each has a positive net amount and businessUse from 0 to 1.',
    "Use snake_case references. A posted receipt has an offset datetime in postedAt; only a posted receipt can be voided. Never write gross, deductible cost or recoverable VAT.",
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath:
    "Receipts are local; the core Camera captures evidence with consent and OCR guesses never post automatically.",
  variants: { density: ["comfortable", "compact"] },
  parts: ["root", "post", "capture", "gross", "deductible_cost", "recoverable_vat"],
  items: {
    key: "rows",
    parts: ["root", "supplier", "date", "photo", "void", "title", "net", "business_use", "category", "vat"],
    set: {
      net: { prop: "net", min: Number.MIN_VALUE },
      business_use: { prop: "businessUse", min: 0, max: 1 },
    },
  },
  partTiers: { capture: "ok" },
  confirmParts: ["void"],
  states: ["filled", "empty", "loading", "success", "error"],
  actions: {
    parts: { post: ["press"], capture: ["press"] },
    items: {
      root: ["press"],
      photo: ["press"],
      void: ["press"],
      net: ["set"],
      business_use: ["set"],
      category: ["select"],
      vat: ["select"],
    },
    when: {
      root: { linked: true },
      photo: { hasPhoto: true },
      void: { canVoid: true },
      post: { canPost: true },
      net: { editable: true },
      business_use: { editable: true },
      category: { editable: true },
      vat: { editable: true },
    },
    noGoto: { items: ["photo", "void"] },
  },
  emptyActions: ["capture.press"],
  read: (input, _state, lang): string[] => {
    const { rows } = input as ReturnType<typeof withRows>;
    return rows.map((row, index) =>
      "supplier" in row
        ? `r${index + 1}: ${row.supplier} · ${row.date}`
        : `r${index + 1}: ${row.title} · ${c.numberLine(row.net, lang)} · ${row.categoryRef} · ${row.vatCode}`,
    );
  },
} as const satisfies c.Meta;

const split = z.strictObject({
  title: c.text(32),
  net: z.number().positive(),
  businessUse: z.number().min(0).max(1),
  categoryRef: ref,
  vatCode: ref,
});
const receipt = z
  .strictObject({
    expenseRef: ref,
    date: c.isoDate,
    supplier: c.text(32),
    receipt: c.photo.optional(),
    lines: z.array(split).min(1).max(8),
    postedAt: dateTime.optional(),
    voided: z.boolean().default(false),
    goto: c.screenId.optional(),
  })
  .refine(({ postedAt, voided }) => !voided || postedAt !== undefined, { path: ["voided"] });
const schema = z
  .strictObject({
    ...c.variantProps(meta.variants),
    style: z.enum(["register", "receipt"]).default("register"),
    receipts: z.array(receipt).min(1).max(6),
    captureGoto: c.screenId.optional(),
  })
  .refine(
    ({ style, receipts }) =>
      distinct(receipts, ({ expenseRef }) => expenseRef) && (style !== "receipt" || receipts.length === 1),
    { path: ["receipts"], message: "Use distinct receipt refs and exactly one receipt in receipt style" },
  );

function withRows(input: z.output<typeof schema>) {
  const editing = input.style === "receipt";
  const receipts = input.receipts.map((row) => ({
    ...row,
    linked: row.goto !== undefined,
    hasPhoto: row.receipt !== undefined,
    canVoid: row.postedAt !== undefined && !row.voided,
  }));
  const first = receipts[0];
  const canPost = editing && first !== undefined && first.postedAt === undefined;
  return {
    ...input,
    canPost,
    capture: input.captureGoto ? { goto: input.captureGoto } : undefined,
    rows: [
      ...receipts,
      ...(editing && first ? first.lines.map((line) => ({ ...line, editable: canPost })) : []),
    ],
  };
}

export const props = schema.overwrite(withRows) as typeof schema &
  z.ZodType<ReturnType<typeof withRows>, z.input<typeof schema>>;

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  return {
    receipts: [
      {
        expenseRef: "item_1",
        date: seedDate,
        supplier: seedTitle(input, 32),
        lines: [
          {
            title: seedTitle(input, 32, 1),
            net: 1,
            businessUse: 1,
            categoryRef: "item_2",
            vatCode: "item_3",
          },
        ],
      },
    ],
  };
}

// prettier-ignore
export const examples = [
  { style: "receipt", captureGoto: "capture", receipts: [
    { expenseRef: "supplies", date: "2026-11-19", supplier: "Fern Nursery", receipt: "local:1", lines: [
      { title: "Potting mix", net: 21, businessUse: 1, categoryRef: "supplies", vatCode: "standard" },
      { title: "Delivery", net: 7, businessUse: 0.5, categoryRef: "travel", vatCode: "standard" },
    ] },
  ] },
  { style: "register", density: "compact", receipts: [
    { expenseRef: "walk_travel", date: "2026-11-20", supplier: "Town Transit", postedAt: "2026-11-20T18:00:00+00:00",
      voided: false, goto: "travel_receipt",
      lines: [{ title: "Walk travel", net: 100, businessUse: 1, categoryRef: "travel", vatCode: "none" }] },
  ] },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Expenses");
export const probes = [
  choose(
    "Keep this business receipt and split the purchase into separate lines with different expense categories, VAT codes and business-use shares.",
  ),
  choose("Give me one number field to enter a quantity, with no receipt or classification.", "Field"),
  write(
    "Edit one draft receipt supplies from Fern Nursery dated 2026-11-19. Potting mix is 21 net, all business, supplies and standard VAT. Delivery is 7 net, half business, travel and standard VAT.",
  ),
  read("Post the draft Fern Nursery receipt.", { address: "e1/post", action: "press" }),
  read(
    "Void the posted Town Transit receipt but keep its audit trail.",
    { address: "e1/r1/void", action: "press" },
    1,
  ),
] satisfies c.Probe[];
