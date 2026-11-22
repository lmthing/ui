import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { receiptCurrency, receiptDetails } from "../copy";
import { paperworkWordsFor } from "../lang";
import { attachment, seedDate, seedRows } from "../seeds";
import { prompt } from "../../../entry/prompt-Receipts.generated";

// Core first: Amount/default shows a number, not evidence files with reviewed status and allocated shares.
export const meta = {
  id: "Receipts",
  status: "ready",
  group: "data",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 2,
  tier: "phone",
  realPath:
    "The person enters or scans receipts and checks them locally, with the brief's currency and no bank or tax service.",
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["category", "tags"] } },
  parts: ["root", "empty", "error"],
  deviceData: ["currency"],
  // prettier-ignore
  items: {
    key: "items",
    parts: ["root", "payee", "date", "amount", "category", "file", "allocation", "allocated_amount", "reviewed", "tags", "remove", "remove_icon"],
  },
  states: ["filled", "empty", "loading", "error"],
  live: { checks: { reviewed: "reviewed" } },
  confirmParts: ["remove"],
  actions: {
    items: { root: ["press"], reviewed: ["check"], remove: ["press"] },
    when: { root: { can_open: true } },
    noGoto: { items: ["remove"] },
  },
  read: (input, _state, lang, data): string[] =>
    (input as z.output<typeof props>).items.flatMap((row) =>
      receiptDetails(row, receiptCurrency(data), lang, true).map(({ line }) => line),
    ),
} as const satisfies c.Meta;

const receipt = z
  .strictObject({
    payee: c.text(32),
    date: c.isoDate,
    amount: z.number().min(0),
    category: c.text(16).optional(),
    file: attachment.optional(),
    allocation: z.number().min(0).max(100).optional(),
    reviewed: z.boolean(),
    tags: z.array(c.text(16)).min(0).max(3),
    goto: c.screenId.optional(),
  })
  .overwrite((row) => ({ ...row, can_open: Boolean(row.file || row.goto) }));

// prettier-ignore
export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  items: z.array(receipt).min(1).max(6),
  style: z.enum(["cards"]).optional(),
}).overwrite((value) => value.detail === "brief" ? {
  ...value, items: value.items.map((row) => ({ ...row, category: undefined, tags: [] })),
} : value);

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  return {
    items: seedRows(input, 32, 16).map(({ title }) => ({
      payee: title,
      date: seedDate,
      amount: 0,
      reviewed: false,
      tags: [],
    })),
  };
}

// prettier-ignore
export const examples = [
  {
    items: [
      { payee: "Fern Nursery", date: "2026-11-19", amount: 24.5, category: "Supplies",
        file: "lib:ledge_supplies", allocation: 50, reviewed: false, tags: ["pots"], goto: "pots" },
    ],
  },
  {
    style: "cards",
    items: [
      { payee: "Walk Supply", date: "2026-11-05", amount: 36, file: "lib:trot_supplies", reviewed: true, tags: ["expenses"] },
      { payee: "Park Permit Office", date: "2026-11-12", amount: 12, reviewed: false, tags: ["fees"] },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Receipts");
export const probes = [
  choose(
    "Save proof scans for purchases with who I paid, date, amount, the percentage I assigned and a tick for whether I checked the receipt.",
  ),
  choose("Show just one formatted figure on its own: the 24.50 I spent. No list or proof files.", "Amount"),
  write(
    "Record a Fern Nursery receipt for 24.50 on 2026-11-19 with supplied scan lib:ledge_supplies. Allocate 50 percent, not reviewed, tag pots.",
  ),
  {
    ...write(
      "Keep the 24.50 Fern Nursery receipt of 2026-11-19, not yet reviewed. Hide the category and tags, but keep the date and amount visible.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Mark the Fern Nursery receipt as reviewed.", { address: "r1/r1/reviewed", action: "check" }),
] satisfies c.Probe[];

type ReceiptsProps = c.Props<typeof props, typeof meta>;

// prettier-ignore
function ReceiptItem({ row, density, surface, currency }: {
  row: ReceiptsProps["items"][number]; density: c.ThemeDensity; surface: "card" | "plain" | undefined; currency: c.Currency;
}) {
  const { lang, words: { receipts: words } } = kit.useWords(paperworkWordsFor);
  const loading = kit.useComponentState() === "loading", canOpen = Boolean(row.file || row.goto);
  const [amount, ...details] = receiptDetails(row, currency, lang);
  const skeleton = <kit.KitSkeleton shape="control" kind="quiet" />;
  const groups = [["date", "category"], ["allocation", "allocated_amount"], ["file"], ["tags"]]
    .map((parts) => details.filter(({ part }) => parts.includes(part)));
  const draw = (group: (typeof groups)[number]) => {
    if (!group.length) return null;
    if (loading) return <kit.KitSkeleton shape="figure" inset="none" density={density}
      content={[["caption", c.clip(group.map(({ line }) => line).join(words.separator), row.payee.length)]]} />;
    return <kit.KitText part={null} role="caption" tone="muted">
      {group.map(({ part, line }, index) => <kit.KitText key={part} {...{ part }} role="caption" tone="muted">
        {index ? words.separator : undefined}{line}
      </kit.KitText>)}
    </kit.KitText>;
  };
  const [date, allocation, file, tags] = groups as [typeof details, typeof details, typeof details, typeof details];
  const dot = <kit.KitSkeleton shape="figure" lead="dot" inset="none" content={[]} />;
  return <kit.KitRow item={row.id} part={null} label="" {...{ density, surface }}
    trailing={loading ? <>{skeleton}{skeleton}</> : <>
      <kit.KitCheck part="reviewed" label={words.review(row.payee)} done={row.reviewed} />
      <kit.KitAction kind="quiet" icon="close" part="remove" a11y={words.remove(row.payee)} />
    </>}>
    <kit.KitRow part={loading ? null : "root"} inline surface="plain" label={loading ? "" : row.payee}
      goto={loading ? undefined : row.goto} role={!loading && row.file ? "button" : "text"} density={density}
      leading={loading ? dot
        : <kit.KitContent lead={<kit.KitIcon name="file_text" tone="muted" decorative />} children={null} />}
      trailing={canOpen ? loading ? dot : <kit.KitContent lead={<kit.KitIcon name="chevron_right" tone="muted" decorative />} children={null} /> : undefined}>
      {loading ? <kit.KitSkeleton shape="figure" inset="none" density={density}
        content={[["body", row.payee], ["number", amount?.line, "start", "compact"]]} /> : <>
        <kit.KitText part="payee" density={density}>{row.payee}</kit.KitText>
        <kit.KitText role="number" numberScale="compact" part="amount" tabular>{amount?.line}</kit.KitText>
      </>}
      <kit.KitContent density={density}>{draw(date)}{draw(allocation)}</kit.KitContent>
      {(file.length > 0 || tags.length > 0) && <kit.KitContent group="response" density={density}>
        {draw(file)}{draw(tags)}
      </kit.KitContent>}
    </kit.KitRow>
  </kit.KitRow>;
}

// prettier-ignore
export function Receipts({ items, style }: ReceiptsProps) {
  const surface = "card";
  const density = kit.useKit().density;
  const state = kit.useComponentState(), { words } = kit.useWords(paperworkWordsFor);
  const currency = receiptCurrency(kit.useDeviceData()), cards = style === "cards";
  return <kit.KitCard style={cards ? "cards" : "inset"} {...{ surface, density }}>
    {state === "empty" ? <kit.KitEmpty part="empty" icon="file_text" decorativeIcon />
      : state === "error" ? <kit.KitEmpty part="error" icon="file_text" decorativeIcon title={words.receipts.unavailable} />
      : <kit.KitGrid list arrange="rows" listRowGap={cards ? "cards" : undefined} density={density}>
        {items.map((row) => <ReceiptItem key={row.id} {...{ row, density, currency }} surface={cards ? surface : undefined} />)}
      </kit.KitGrid>}
  </kit.KitCard>;
}
