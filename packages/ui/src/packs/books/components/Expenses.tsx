import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
// prettier-ignore
import { expenseDisplay, expenseEditPath, expenseNet, expenseRead, expenseReceipt, expenseRow, expenseRows, previewExpenses, type ExpenseRow, type ReceiptRow, type SplitRow } from "../copy";
import { booksWordsFor } from "../lang";
import { distinct, seedDate, seedTitle } from "../seeds";

// Core first: Field/number cannot split receipt costs by category, VAT code and business-use fraction.
// prettier-ignore
export const meta = {
  id: "Expenses", status: "ready", group: "input", purpose: "Record business receipts and split their costs for bookkeeping and VAT.",
  pick: "Receipt-backed business costs split into lines with a category, VAT code and business-use fraction. Not one ordinary form value (Field), a photo for a warranty (Warranties), staff approval (Approval), or the entire cash ledger (Ledger).",
  writeHints: [
    'Use style "receipt" for exactly one receipt with editable draft lines; otherwise use "register". A receipt has one to eight splits; each has a positive net amount and businessUse from 0 to 1.',
    "Use snake_case references. A posted receipt has an offset datetime in postedAt; only a posted receipt can be voided. Never write gross, deductible cost or recoverable VAT.",
    "For a register with only the gross totals, use detail \"brief\". Keep all receipt data.",
  ], region: "body", weight: 3, dense: true, tier: "phone",
  realPath: "Receipts are local; the core Camera captures evidence with consent and OCR guesses never post automatically.",
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["deductible_cost", "recoverable_vat"] } },
  parts: ["root", "post", "post_label", "capture", "capture_label", "gross", "deductible_cost", "recoverable_vat"],
  items: {
    key: "rows",
    parts: ["root", "supplier", "date", "photo", "photo_label", "void", "void_label",
      "title", "net", "business_use", "category", "vat", "gross", "deductible_cost", "recoverable_vat"],
    set: { net: { prop: "net", min: Number.MIN_VALUE }, business_use: { prop: "businessPercent", min: 0, max: 100 } },
    deviceData: { rows: expenseRows, schema: expenseRow }, editPath: expenseEditPath, edits: {
      category: { action: "select", prop: "categoryRef", choices: { row: "categories" } },
      vat: { action: "select", prop: "vatCode", choices: { row: "vatRates" } } },
  }, partTiers: { capture: "ok" }, confirmParts: ["void"],
  states: ["filled", "empty", "loading", "success", "error"], actions: {
    parts: { post: ["press"], capture: ["press"] },
    items: { root: ["press"], photo: ["press"], void: ["press"], net: ["set"], business_use: ["set"],
      category: ["select"], vat: ["select"] },
    when: { root: { linked: true }, photo: { hasPhoto: true }, void: { canVoid: true }, post: { canPost: true },
      net: { editable: true }, business_use: { editable: true }, category: { editable: true }, vat: { editable: true } },
    noGoto: { items: ["photo", "void"] } },
  emptyActions: ["capture.press"], readSuccess: true, successActions: ["root.press", "photo.press", "void.press", "capture.press"],
  deviceData: ["books_expense_rules", "books_expense_choices"], previewDeviceData: previewExpenses, read: expenseRead,
} as const satisfies c.Meta;

// prettier-ignore
const schema = z.strictObject({
  ...c.variantProps(meta.variants), style: z.enum(["register", "receipt"]).default("register"),
  receipts: z.array(expenseReceipt).min(1).max(6), captureGoto: c.screenId.optional() })
  .refine(({ style, receipts }) =>
    distinct(receipts, ({ expenseRef }) => expenseRef) && (style !== "receipt" || receipts.length === 1),
    { path: ["receipts"], message: "Use distinct receipt refs and exactly one receipt in receipt style" });

// prettier-ignore
function withRows(input: z.output<typeof schema>) {
  return { ...input, canPost: input.style === "receipt" && input.receipts[0]?.postedAt === undefined,
    capture: input.captureGoto ? { goto: input.captureGoto } : undefined, rows: expenseRows({}, input) };
}

export const props = schema.overwrite(withRows) as typeof schema &
  z.ZodType<ReturnType<typeof withRows>, z.input<typeof schema>>;

// prettier-ignore
export function fallback(input: c.FallbackInput): z.input<typeof props> {
  return { receipts: [{ expenseRef: "item_1", date: seedDate, supplier: seedTitle(input, 32),
    lines: [{ title: seedTitle(input, 32, 1), net: 1, businessUse: 1, categoryRef: "item_2", vatCode: "item_3" }] }] };
}

// prettier-ignore
export const examples = [
  { style: "receipt", captureGoto: "capture", receipts: [
    { expenseRef: "supplies", date: "2026-11-19", supplier: "Fern Nursery", receipt: "local:1", lines: [
      { title: "Potting mix", net: 21, businessUse: 1, categoryRef: "supplies", vatCode: "standard" },
      { title: "Delivery", net: 7, businessUse: 0.5, categoryRef: "travel", vatCode: "standard" },
    ] },
  ] },
  { style: "register", receipts: [
    { expenseRef: "walk_travel", date: "2026-11-20", supplier: "Town Transit", postedAt: "2026-11-20T18:00:00+00:00",
      voided: false, goto: "travel_receipt",
      lines: [{ title: "Walk travel", net: 100, businessUse: 1, categoryRef: "travel", vatCode: "none" }] }] },
  { detail: "brief", receipts: [{ expenseRef: "walk_travel", date: "2026-11-20", supplier: "Town Transit",
    postedAt: "2026-11-20T18:00:00+00:00", goto: "travel_receipt",
    lines: [{ title: "Walk travel", net: 100, businessUse: 1, categoryRef: "travel", vatCode: "none" }] }] },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Expenses");
// prettier-ignore
export const probes = [
  choose("Keep this business receipt and split the purchase into separate lines with different expense categories, VAT codes and business-use shares."),
  choose("On a form, let me type a quantity into one labelled numeric input. No plus or minus buttons, no receipt and no classification.", "Field"),
  write("Edit one draft receipt supplies from Fern Nursery dated 2026-11-19. Potting mix is 21 net, all business, supplies and standard VAT. Delivery is 7 net, half business, travel and standard VAT."),
  { ...write("Give me a register with only gross totals. Keep the Town Transit receipt walk_travel from 2026-11-20, for Walk travel at 100 net, all business, category travel, VAT code none. Don't show deductible cost or recoverable VAT."),
    variant: { axis: "detail", value: "brief" } },
  read("Post the draft Fern Nursery receipt.", { address: "e1/post", action: "press" }),
  read("Void the posted Town Transit receipt but keep its audit trail.", { address: "e1/r1/void", action: "press" }, 1),
] satisfies c.Probe[];

type View = c.Props<typeof props, typeof meta>;
type Density = c.ThemeDensity;

// prettier-ignore
function SplitChoice({ part, label, selected, options, editable }: {
  part: string; label: string; selected: string; options: SplitRow["categories"]; editable: boolean }) {
  const { lang, words } = kit.useWords(booksWordsFor);
  const value = options.find(({ value }) => value === selected)?.label ?? words.ledger.refLabel(selected, lang);
  return <kit.KitContent>
    <kit.KitText part={null} role="label" tone="muted">{label}</kit.KitText>
    {editable && options.length ? <kit.KitTrack {...{ part, label }} role="radiogroup">
      {options.map(({ value, label }) => <kit.KitChip key={value} item={null} role="radio" {...{ value, label }} on={value === selected} />)}
    </kit.KitTrack> : <kit.KitText {...{ part }} role="body">{value}</kit.KitText>}
  </kit.KitContent>;
}
// prettier-ignore
function SplitLine({ row, density, editable }: { row: SplitRow; density: Density; editable: boolean }) {
  const { lang, words: { expenses: w } } = kit.useWords(booksWordsFor), { title, net, businessPercent } = row;
  const fraction = c.percentageLine(businessPercent, lang), money = expenseNet(net, kit.useDeviceData(), lang);
  const field = (part: string, label: string, amount: number, formatted: string, min: number, max?: number) =>
    <kit.KitContent {...{ density }}>
      <kit.KitText part={null} role="label" tone="muted">{label}</kit.KitText>
      {editable ? <kit.KitInput action="set" kind="number" compact projected {...{ part, label, min }}
        {...(max === undefined ? {} : { max })} hint={label} value={String(amount)} /> :
        <kit.KitText {...{ part }} role="body" tabular>{formatted}</kit.KitText>}
    </kit.KitContent>;
  return <kit.KitRow item={row.id} label={title} inline {...{ density }}>
    <kit.KitContent group="response" {...{ density }}>
      <kit.KitText part="title" role="body" emphasis="strong">{title}</kit.KitText>
      <kit.KitGrid {...{ density }}>{field("net", w.net, net, money, Number.MIN_VALUE)}
        {field("business_use", editable ? w.share : w.business, businessPercent, fraction, 0, 100)}</kit.KitGrid>
      <SplitChoice part="category" label={w.category} selected={row.categoryRef} options={row.categories} {...{ editable }} />
      <SplitChoice part="vat" label={w.vatCode} selected={row.vatCode} options={row.vatRates} {...{ editable }} />
    </kit.KitContent>
  </kit.KitRow>;
}
// prettier-ignore
function ExpenseFigures({ row, lines, density, detail }: { row: ReceiptRow; lines: SplitRow[]; density: Density; detail: c.AxisValue<"detail"> }) {
  const { lang, words: { expenses: w } } = kit.useWords(booksWordsFor);
  const figures = expenseDisplay(row, lines.length ? lines : row.lines, kit.useDeviceData(), lang);
  const amount = (part: string, label: string, text: string) => <kit.KitGrid fitLast {...{ density }}>
    <kit.KitText part={null} role="label" tone="muted">{label}</kit.KitText>
    <kit.KitText {...{ part }} role="number" numberScale="compact" tabular>{text}</kit.KitText>
  </kit.KitGrid>;
  return figures ? <kit.KitContent {...{ density }}>
    {amount("gross", w.gross, figures.gross)}
    {detail !== "brief" && <>{amount("deductible_cost", w.cost, figures.cost)}{amount("recoverable_vat", w.vat, figures.vat)}</>}
  </kit.KitContent> : <kit.KitText part={null} role="label" tone="muted">{w.unavailable}</kit.KitText>;
}
// prettier-ignore
function ReceiptLine({ row, density, detail, register }: { row: ReceiptRow; density: Density; detail: c.AxisValue<"detail">; register: boolean }) {
  const { lang, words: { expenses: w } } = kit.useWords(booksWordsFor);
  const state = kit.useComponentState(), lead = row.receipt && <kit.KitIcon name="file_text" decorative tone="muted" />;
  return <kit.KitRow item={row.id} part={null} label={row.supplier} inline {...{ density }}>
    <kit.KitContent {...{ density }} group="response">
      <kit.KitContent {...{ density, lead }} lineRole="body">
        <kit.KitRow part="root" label={row.supplier} goto={row.goto} inline {...{ density }}>
          <kit.KitText part="supplier" role="body" emphasis="strong">{row.supplier}</kit.KitText>
          <kit.KitText part="date" role="label" tone="muted">{c.appointmentDate(row.date, lang)}</kit.KitText>
          <kit.KitText part={null} role="label" tone={row.voided ? "bad" : state === "success" ? "good" : "muted"}>
            {row.voided ? w.voided : row.postedAt ? w.posted : state === "success" ? w.saved : w.draft}</kit.KitText>
        </kit.KitRow>
        {row.receipt && <kit.KitRow part="photo" role="button" label={w.evidence} inline {...{ density }}>
          <kit.KitText part="photo_label" role="label" tone="accent">{w.evidence}</kit.KitText></kit.KitRow>}
      </kit.KitContent>
      {register && <ExpenseFigures {...{ row, density, detail }} lines={[]} />}
      {row.canVoid && <kit.KitContent group="response" {...{ density }}><kit.KitRow part="void" role="button" label={w.void} inline {...{ density }}>
        <kit.KitText part="void_label" role="label" tone="bad">{w.void}</kit.KitText></kit.KitRow></kit.KitContent>}
    </kit.KitContent>
  </kit.KitRow>;
}
// prettier-ignore
export function Expenses(input: View) {
  const density = kit.useKit().density, surface = "card";
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const state = kit.useComponentState(), { lang, words: { expenses: w } } = kit.useWords(booksWordsFor), data = kit.useDeviceData();
  const { rows = [], canPost } = kit.useLiveControls(meta, input) as { rows?: ExpenseRow[]; canPost?: boolean };
  const receipts = rows.filter((row): row is ReceiptRow => row.kind === "receipt"), lines = rows.filter((row): row is SplitRow => row.kind === "split");
  const register = input.style === "register", heading = register ? w.register : w.receipt;
  return <kit.KitCard part="root" padded {...{ density, surface }}>
    {state === "loading" ? <><kit.KitSkeleton shape="figure" inset="none" content={[[ "label", heading ]]} />
      {receipts.map((row) => { const amounts = expenseDisplay(row, row.lines, data, lang); return <kit.KitContent key={row.id} group="response" {...{ density }}>
        <kit.KitSkeleton shape="figure" inset="none" lead={row.receipt ? "box" : "none"} content={[[ "body", row.supplier ], [ "label", row.date ], [ "label", w.draft ]]} />
        <kit.KitGrid fitLast {...{ density }}><kit.KitSkeleton shape="figure" inset="none" content={[[ "label", w.gross ], [ "label", w.cost ], [ "label", w.vat ]]} />
          <kit.KitSkeleton shape="figure" inset="none" content={[amounts?.gross, amounts?.cost, amounts?.vat].map((text) => ["number", text ?? expenseNet(row.lines[0]!.net, data, lang), "end", "compact"])} /></kit.KitGrid>
      </kit.KitContent>; })}
      {lines.map((row) => <kit.KitRow key={row.id} item={row.id} part={null} inline label={row.title} {...{ density }}><kit.KitContent group="response" {...{ density }}>
        <kit.KitSkeleton shape="figure" inset="none" content={[[ "body", row.title ]]} />
        <kit.KitGrid {...{ density }}><kit.KitSkeleton shape="control" label={w.net} full /><kit.KitSkeleton shape="control" label={w.business} full /></kit.KitGrid>
        {([["category", w.category, row.categories], ["vat", w.vatCode, row.vatRates]] as const).map(([part, label, options]) =>
          <kit.KitContent key={part}><kit.KitSkeleton shape="figure" inset="none" content={[[ "label", label ]]} />
            <kit.KitTrack {...{ part }}>{options.map(({ value, label }) =>
              <kit.KitChip key={value} item={null} part={null} role="radio" {...{ label }} on={false} disabled />)}</kit.KitTrack></kit.KitContent>)}
      </kit.KitContent></kit.KitRow>)}
      {canPost && <kit.KitSkeleton shape="control" label={w.post} full />}{input.captureGoto && <kit.KitSkeleton shape="control" kind="secondary" label={w.capture} full />}</> :
      state === "error" ? <kit.KitEmpty decorativeIcon icon="file_text" title={w.errorTitle} sub={w.errorDetail} /> :
      state === "empty" ? <kit.KitEmpty decorativeIcon /> : <>
        <kit.KitText part={null} role="label" tone="muted">{heading}</kit.KitText>
        {receipts.map((row) => <ReceiptLine key={row.id} {...{ row, density, detail, register }} />)}
        {!register && receipts[0] && <ExpenseFigures row={receipts[0]} {...{ lines, density, detail }} />}
        {lines.map((row) => <SplitLine key={row.id} {...{ row, density }} editable={row.editable && state === "filled"} />)}
        {canPost && state === "filled" && <kit.KitContent group="response" {...{ density }}><kit.KitAction part="post" label={w.post} full /></kit.KitContent>}
      </>}
    {input.captureGoto && state !== "loading" && state !== "error" && <kit.KitAction part="capture" label={w.capture} goto={input.captureGoto} kind="secondary" full />}
  </kit.KitCard>;
}
