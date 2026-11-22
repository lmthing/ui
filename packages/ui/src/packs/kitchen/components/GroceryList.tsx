import { z } from "zod";
import {
  wordsFor,
  itemsOf,
  placeholderTitle,
  probesFor,
  text,
  thingOf,
  titleOf,
  variantProps,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../../../catalog";
import {
  KitCard,
  KitCheck,
  KitContent,
  KitEmpty,
  KitGrid,
  KitInput,
  KitRow,
  KitText,
  useComponentState,
  useControlValue,
  useKit,
  usePartContext,
  useVariant,
  useWords,
} from "../../../kit";
import { groceryRead } from "../copy";
import { kitchenWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-GroceryList.generated";
// Core first: Checklist/default cannot group groceries by aisle with quantities and shared authors.
export const meta = {
  id: "GroceryList",
  status: "ready",
  group: "input",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  partTiers: { by: "people" },
  realPath: "A list stored on the device; authors and others' additions require a shared household app.",
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["by"] } },
  items: { key: "rows", parts: ["root", "name", "qty", "got", "by"] },
  parts: ["root", "add", "summary"],
  states: ["filled", "empty", "success"],
  signature: "check_burst",
  actions: { items: { got: ["check"] }, parts: { add: ["type"] } },
  read: (input, state, lang?: string): string[] =>
    state === "filled" ? groceryRead(input as z.output<typeof props>, lang) : [],
} as const satisfies Meta;
export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    aisles: z
      .array(
        z.strictObject({
          label: text(16),
          items: z
            .array(
              z.strictObject({
                name: text(28),
                qty: text(12).optional(),
                got: z.boolean().default(false),
                by: text(12).optional(),
              }),
            )
            .min(1)
            .max(12),
        }),
      )
      .min(1)
      .max(8),
  })
  .overwrite((value) => ({
    ...value,
    rows: value.aisles.flatMap((aisle, aisleIndex) => aisle.items.map((item) => ({ ...item, aisleIndex }))),
  }));
export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const { placeholderDetail } = wordsFor(lang);
  const thing = thingOf(cast);
  const items = itemsOf(cast, 3).map((item, index) => ({
    name: titleOf(item, 28, thing) ?? placeholderTitle(index, lang),
    got: false,
  }));
  const rows = items.length ? items : [{ name: placeholderTitle(0, lang), got: false }];
  return { aisles: [{ label: placeholderDetail, items: rows }] };
}
// prettier-ignore
const breakfast = { aisles: [{ label: "Breakfast", items: [
  { name: "Oats", qty: "1 bag", got: false },
  { name: "Milk", qty: "1 L", got: false, by: "Alex" },
] }] } satisfies z.input<typeof props>;
// prettier-ignore
export const examples = [
  // Ledge: the plant keeper's household supper.
  { aisles: [
    { label: "Produce", items: [{ name: "Tomatoes", qty: "600 g", got: false, by: "Sam" }] },
    { label: "Dairy", items: [{ name: "Ricotta", qty: "250 g", got: true }] },
  ] },
  breakfast,
  { ...breakfast, detail: "brief" },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("GroceryList");
export const probes = [
  choose("Tick groceries off in the shop, grouped by aisle, with quantities and who added each"),
  choose("Tick off household jobs without quantities, aisles or people who added them", "Checklist"),
  write(
    "A grocery list: Produce has 600 g tomatoes not yet bought, added by Sam. Dairy has 250 g ricotta already bought",
  ),
  {
    ...write(
      "Shopping list for Produce: 600 g tomatoes added by Sam. Keep Sam as the author in the data but hide who added groceries on the screen.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Mark tomatoes as bought", { address: "g1/r1/got", action: "check" }),
  read("Add another grocery item", { address: "g1/add", action: "type" }),
] satisfies Probe[];
type GroceryRow = z.output<typeof props>["aisles"][number]["items"][number] & {
  id: string;
  aisleIndex: number;
};
function GroceryItem({ row, detail }: { row: GroceryRow; detail: "full" | "brief" }) {
  return (
    <KitRow
      item={row.id}
      label={row.name}
      inline
      trailing={<KitCheck done={row.got} part="got" label={row.name} />}
    >
      <KitText role="body" tone={row.got ? "muted" : "text"} strike={row.got} part="name">
        {row.name}
      </KitText>
      {row.qty && (
        <KitText
          part="qty"
          role="number"
          numberScale="compact"
          tone={detail === "brief" || row.got ? "muted" : "text"}
          lines={1}
        >
          {row.qty}
        </KitText>
      )}
      {detail === "full" && row.by && (
        <KitText part="by" role="caption" tone="muted" lines={1} children={row.by} />
      )}
    </KitRow>
  );
}
// prettier-ignore
export function GroceryList(value: Props<typeof props, typeof meta>) {
  const { aisles, rows } = value as typeof value & { rows: GroceryRow[] };
  const detail = useVariant("detail", meta.variants.detail, value.detail);
  const state = useComponentState();
  const { words: { groceryLabels } } = useWords(kitchenWordsFor);
  const { screen, component } = usePartContext();
  const { controller } = useKit();
  // Every signature action advances the cue, including repeated checks on one stable row.
  useControlValue(`${screen}/${component}/$cue`, 0);
  const live = rows.map((row) => ({
    ...row,
    got: (controller?.store.get(`${screen}/${component}/${row.id}/got`) as boolean | undefined) ?? row.got,
  }));
  return (
    <KitCard style="inset" padded part="root">
      {state === "empty" || state === "success" ? (
        <KitEmpty part="summary" decorativeIcon {...(state === "success"
          ? ({ icon: "check", title: groceryLabels.allGot, tone: "good" } as const) : {})} />
      ) : (
        <>
          {live.every((row) => row.got) && <KitText role="heading" tone="good" part="summary">{groceryLabels.allGot}</KitText>}
          {aisles.map((aisle, index) => (
            <KitContent key={index} group={index ? "response" : "content"}>
              <KitText role="label" tone="muted" part={null}>{aisle.label}</KitText>
              <KitGrid arrange="rows" list listRowGap="cards">
                {live.filter((row) => row.aisleIndex === index)
                  .sort((a, b) => Number(a.got) - Number(b.got))
                  .map((row) => <GroceryItem key={row.id} {...{ row, detail }} />)}
              </KitGrid>
            </KitContent>
          ))}
        </>
      )}
      <KitInput part="add" hint={groceryLabels.newItem} label={groceryLabels.newItem} icon="plus" />
    </KitCard>
  );
}
