import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { savedItemCopy, savedListReading } from "../copy";
import { commerceWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-SavedList.generated";
const maxPrice = 99999.99;
const price = z.number().min(0).max(maxPrice).multipleOf(0.01);

// Core first: List/trail badge can open a saved link, but cannot compare shop prices, set alerts or move goods into a basket.
// prettier-ignore
export const meta = {
  id: "SavedList", status: "ready", group: "content",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body", weight: 3, dense: true, tier: "phone",
  partTiers: { claim: "people" },
  confirmParts: ["remove"],
  realPath: "Saved products and target prices stay on device; gift claims need a shared app and price alerts need notifications or a watch service.",
  variants: { arrange: ["rows", "grid"], density: ["comfortable", "compact"], surface: ["card", "plain"] },
  parts: ["root", "empty", "status"],
  items: {
    key: "items",
    parts: ["root", "tile", "name", "photo", "price", "saved_price", "badge", "alert", "target_label", "claim", "claim_label", "move", "move_label", "remove", "remove_icon"],
    set: { alert: { prop: "targetPrice", min: 0, max: maxPrice } },
  },
  states: ["filled", "empty", "loading", "success", "error"],
  actions: {
    items: { root: ["press"], move: ["press"], alert: ["set"], claim: ["toggle"], remove: ["press"] },
    when: { root: { linked: true }, move: { available: true }, claim: { shared: true } },
    noGoto: { items: ["move", "remove"] },
  },
  successActions: ["root.press", "move.press", "alert.set", "claim.toggle", "remove.press"],
  readSuccess: true,
  recordRuntime: { kind: "saved_products", presses: { remove: savedPress("remove"), move: savedPress("move") }, project: projectSaved },
  read: (input, state, lang, _data, currency): string[] => savedListReading(input as SavedProps, state, lang, currency),
} as const satisfies c.Meta;

// prettier-ignore
const item = z.strictObject({
  id: c.text(24).meta({ kind: undefined }), name: c.text(28), photo: c.photo.optional(),
  price, savedPrice: price.optional(), targetPrice: price.optional(),
  stock: z.int().min(0).optional(), claimed: z.boolean().default(false), goto: c.screenId.optional(),
});

// prettier-ignore
export const props = z.strictObject({
    items: z.array(item).min(1).max(12), shared: z.boolean().default(false), ...c.variantProps(meta.variants),
  })
  .refine(({ items }) => new Set(items.map(({ id }) => id)).size === items.length, { path: ["items"] })
  .overwrite((input) => ({
    ...input,
    items: input.items.map((row) => ({ ...row, productRef: row.id, linked: Boolean(row.goto), available: row.stock !== 0 })),
  }));

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const names = c.itemsOf(cast, 3).flatMap((record) => c.titleOf(record, 28, thing) ?? []);
  return {
    items: (names.length ? names : [c.placeholderTitle(0, lang)]).map((name, i) => ({
      id: `item_${i + 1}`,
      name,
      price: Number(c.wordsFor(lang).placeholderValue),
    })),
  };
}

// prettier-ignore
export const examples = [
  { items: [
    { id: "fern_pot", name: "Glazed fern pot", photo: "lib:fern", price: 12, savedPrice: 16,
      targetPrice: 11, stock: 8, goto: "fern" },
    { id: "basil_planter", name: "Basil planter", photo: "lib:basil", price: 10, savedPrice: 10, stock: 2 },
  ] },
  { arrange: "grid", shared: true, items: [
    { id: "walk_lead", name: "Reflective lead", photo: "lib:dog", price: 18, savedPrice: 20, targetPrice: 15, claimed: true, goto: "lead" },
    { id: "treat_pouch", name: "Treat pouch", photo: "local:2", price: 14, savedPrice: 16, stock: 0 },
  ] },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("SavedList");
// prettier-ignore
export const probes = [
  choose("Keep shop products I want to buy later, compare the prices I saved them at, set a price alert, and move a saved item into my basket."),
  choose("Show ordinary saved links to the fern and basil care pages as short rows with a badge. No prices or buying.", "List"),
  write("I saved fern_pot, Glazed fern pot, at 16. It now costs 12, there are 8 left, and I want an alert at 11. Link it to fern."),
  {
    ...write("Display two columns of saved shop products: walk_lead Reflective lead is 18 and treat_pouch Treat pouch is 14. I had saved them at 20 and 16 respectively."),
    variant: { axis: "arrange", value: "grid", itemTitles: ["Reflective lead", "Treat pouch"] },
  },
  read("Open the product page for the glazed fern pot", { address: "s1/r1", action: "press" }),
  read("Move the glazed fern pot into my basket without opening its product page", { address: "s1/r1/move", action: "press" }),
  read("Set the glazed fern pot's price alert to 10", { address: "s1/r1/alert", action: "set" }),
  read("Mark the treat pouch as claimed on the shared gift list", { address: "s1/r2/claim", action: "toggle" }, 1),
  read("Start removing the basil planter from saved items", { address: "s1/r2/remove", action: "press" }),
] satisfies c.Probe[];

type SavedProps = c.Props<typeof props, typeof meta> & { moved?: boolean };
type SavedRow = z.output<typeof item>;
type SavedChange = { id: string; kind: "move" | "remove" };
// Keep Writer rows and their ordinals intact so later alert edits still target the original item.
function projectSaved({ props, journal }: c.RecordContext): c.Values {
  const rows = props.items as (SavedRow & { productRef: string })[];
  const removed = new Set((journal as SavedChange[]).map(({ id }) => id));
  return {
    items: rows.filter(({ productRef }) => !removed.has(productRef)),
    moved: (journal.at(-1) as SavedChange | undefined)?.kind === "move",
  };
}

function savedPress(kind: SavedChange["kind"]): NonNullable<c.RecordRuntime["presses"]>[string] {
  return {
    target: (row) => String(row.productRef),
    plan: (_context, row) => ({ operation: { kind, id: String(row.productRef) } satisfies SavedChange }),
  };
}

// prettier-ignore
function SavedDetails({ row, grid, density }: { row: SavedRow; grid: boolean; density: c.ThemeDensity }) {
  const { lang, words } = kit.useWords(commerceWordsFor), currency = kit.useAppCurrency();
  const copy = savedItemCopy(row, lang, currency);
  const photo = <kit.KitPhoto {...(row.photo && { photo: row.photo })} label={row.name}
    part="photo" aspect={grid ? "wide" : "auto"} />;
  const previous = copy.previous && <kit.KitText part="saved_price" role="caption" tone="muted" lines={1}>{copy.previous}</kit.KitText>;
  return <kit.KitRow item={row.id} inline={grid} inset="none" label={row.name} goto={row.goto} lineRole="heading"
    leading={grid ? undefined : photo} leadingAlign="row" density={density}>
    {grid && photo}
    <kit.KitText part="name" role="heading" lines={2} density={density}>{row.name}</kit.KitText>
    <kit.KitText part="price" role="number" numberScale="compact" tabular>{copy.current}
      {grid && previous && <kit.KitText part={null}>{words.savedList.priceGap}{previous}</kit.KitText>}
    </kit.KitText>
    {!grid && previous}
    {(grid || copy.badge) && <kit.KitText part={copy.badge ? "badge" : null} role="caption" lines={1}
      {...(copy.badge && { tone: copy.badge.tone })}>{copy.badge?.text ?? words.savedList.blank}</kit.KitText>}
  </kit.KitRow>;
}

// prettier-ignore
function SavedControls({ row, shared, density }: { row: SavedRow; shared: boolean; density: c.ThemeDensity }) {
  const { words: { savedList: words } } = kit.useWords(commerceWordsFor);
  const loading = kit.useComponentState() === "loading";
  return <>
    <kit.KitContent density={density}>
      {loading ? <kit.KitSkeleton shape="figure" inset="none" content={[["caption", words.target]]} />
        : <kit.KitText role="caption" part="target_label" tone="muted">{words.target}</kit.KitText>}
      <kit.KitInput part="alert" action="set" kind="number" label={words.alert(row.name)}
        hint="" value={row.targetPrice === undefined ? undefined : String(row.targetPrice)}
        projected compact min={0} max={maxPrice} step={0.01} />
    </kit.KitContent>
    {shared && <kit.KitRow part={null} inline label={words.claim} density={density} trailing={
      <kit.KitTrail kind="toggle" part="claim" label={words.claimItem(row.name)} on={row.claimed} />
    }>{loading ? <kit.KitSkeleton shape="figure" inset="none" content={[["label", words.claim]]} />
      : <kit.KitText role="label" part="claim_label">{words.claim}</kit.KitText>}</kit.KitRow>}
    <kit.KitGrid fitLast density={density}>
      <kit.KitAction part="move" kind="secondary" full label={words.move} disabled={row.stock === 0} />
      <kit.KitAction part="remove" kind="quiet" icon="trash" a11y={words.remove(row.name)} />
    </kit.KitGrid>
  </>;
}

// prettier-ignore
function SavedLoading({ row, grid, density }: { row: SavedRow; grid: boolean; density: c.ThemeDensity }) {
  const { lang } = kit.useWords(commerceWordsFor), currency = kit.useAppCurrency();
  const copy = savedItemCopy(row, lang, currency);
  const lines = [{ role: "heading" as const, text: row.name },
    { role: "number" as const, text: copy.current, numberScale: "compact" as const },
    ...[copy.previous, copy.badge?.text].flatMap((text) => text ? [{ role: "caption" as const, text }] : [])];
  return grid ? <kit.KitSkeleton shape="media" aspect="wide" inset="none" content={lines.map(({ role, text }) => [role, text])} />
    : <kit.KitSkeleton rows={1} density={density} inset="none"
      items={[{ ...(row.photo && { photo: row.photo }), lead: "box", lines }]} />;
}

// prettier-ignore
export function SavedList(input: SavedProps) {
  const scope = kit.usePartContext(), state = kit.useComponentState();
  const { words } = kit.useWords(commerceWordsFor);
  const live = kit.useLiveControls(meta, input) as SavedProps;
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const { arrange, shared, items, moved } = live, grid = arrange === "grid";
  const empty = state === "empty" || !items.length, loading = state === "loading";
  const error = state === "error", success = state === "success" || (state === "filled" && moved);
  return <kit.KitCard part="root" style={empty || error ? "inset" : "cards"} density={density}>
    {success && <kit.KitContent inset="md"><kit.KitText part="status" role="label" tone="good">
      {words.savedList.success}
    </kit.KitText></kit.KitContent>}
    {error ? <kit.KitEmpty part="status" icon="alert" title={words.savedList.error} decorativeIcon />
      : empty ? <kit.KitEmpty part="empty" decorativeIcon /> : <kit.KitGrid arrange={arrange} list listRowGap="cards" density={density}>
      {items.map((row) => <kit.PartScope key={row.id} {...scope} item={row.id}>
        <kit.KitCard part="tile" padded {...{ density, surface }}>
          {loading ? <SavedLoading {...{ row, grid, density }} /> : <SavedDetails {...{ row, grid, density }} />}
          <SavedControls {...{ row, shared, density }} />
        </kit.KitCard>
      </kit.PartScope>)}
    </kit.KitGrid>}
  </kit.KitCard>;
}
