import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { inlineCountMax, matchesThingFilter, thingsEmpty, thingsReading } from "../copy";
import { inventoryWordsFor } from "../lang";
import * as tile from "./thing-tile";
import { prompt } from "../../../entry/prompt-Things.generated";

// Core first: List/cards cannot adjust owned quantities or flag stock at its minimum.
const maxQuantity = Number.MAX_SAFE_INTEGER;
export const meta = {
  id: "Things",
  status: "ready",
  group: "content",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "Stock and ownership records live on the device.",
  variants: { arrange: ["grid", "rows"], density: ["comfortable", "compact"], surface: ["card", "outlined"] },
  parts: ["root", "empty", "scan", "scan_label", "scan_icon"],
  partTiers: { scan: "ok" },
  items: {
    key: "items",
    // prettier-ignore
    parts: ["tile", "root", "name", "photo", "qty", "where", "value", "low", "serial", "condition", "expected", "counted"],
    adjust: {
      "qty.increment": { prop: "qty", delta: 1, min: 0, max: maxQuantity },
      "qty.decrement": { prop: "qty", delta: -1, min: 0, max: maxQuantity },
    },
    visibleWhen: { visible: true },
  },
  states: ["filled", "empty", "loading"],
  actions: {
    parts: { scan: ["press"] },
    items: { root: ["press"], qty: ["increment", "decrement"] },
    when: { scan: { canScan: true } },
  },
  read: (input, state, lang): string[] =>
    state === "filled" ? thingsReading(input as z.output<typeof props>, lang) : [],
} as const satisfies c.Meta;

const item = z.strictObject({
  name: c.text(28),
  photo: c.photo.optional(),
  qty: z.int().nonnegative(),
  min: z.int().nonnegative().optional(),
  where: c.text(24).optional(),
  value: z.number().nonnegative().optional(),
  serial: c.text(24).optional(),
  condition: z.enum(["new", "good", "worn", "damaged"]).optional(),
  expected: z.int().nonnegative().optional(),
  goto: c.screenId,
});
export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    items: z.array(item).min(1).max(12),
    filter: z.enum(["all", "low", "missing"]).default("all"),
    style: z.enum(["audit"]).optional(),
    scan: z.strictObject({ goto: c.screenId }).optional(),
  })
  .overwrite((value) => ({
    ...value,
    canScan: value.scan !== undefined,
    items: value.items.map((row) => ({
      ...row,
      visible: matchesThingFilter(row, value.filter),
    })),
  }));

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const items = c.itemsOf(cast, 3).map((row, i) => ({
    name: c.titleOf(row, 28, thing) ?? c.placeholderTitle(i, lang),
    where: c.detailOf(row, 24, thing),
    qty: 0,
    goto: "details",
  }));
  return {
    items: items.length ? items : [{ name: c.placeholderTitle(0, lang), qty: 0, goto: "details" }],
  };
}

// prettier-ignore
const ledge = [
  { name: "Clay pot", photo: "lib:plants", qty: 2, min: 2, where: "Potting shelf", value: 8, goto: "pots" },
  { name: "Seed tray", photo: "lib:seed_tray", qty: 8, min: 2, where: "Greenhouse", value: 12, goto: "trays" },
] satisfies [z.input<typeof item>, z.input<typeof item>];
// prettier-ignore
export const examples = [
  { items: ledge },
  { filter: "low", items: [
      { name: "Bag roll", qty: 1, min: 2, where: "Van bin", value: 3, goto: "bags" },
      { name: "Bowl", photo: "lib:dogs", qty: 0, min: 1, where: "Kit cupboard", value: 9, goto: "bowls" },
  ] },
  { arrange: "rows", items: ledge },
  { filter: "missing", items: [
      { name: "Spare lead", qty: 0, where: "Van bin", goto: "lead" },
  ], scan: { goto: "scan_inventory" } },
  { items: [{ ...ledge[0], serial: "LEDGE-042", condition: "worn" }, ledge[1]] },
  { style: "audit", items: [
      { name: "Seed tray", qty: 8, expected: 10, goto: "trays", where: "Greenhouse" },
      { name: "Clay pot", qty: 2, expected: 2, goto: "pots" },
  ] },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Things");
// prettier-ignore
export const probes = [
  choose(
    "Track the gear I own with quantities I can adjust, storage bins and a minimum on each item that flags low stock",
  ),
  choose(
    "Show three profile links as plain rows: Anna, Ben and Cleo. Each row has just the name and opens that profile screen, no photos, contact buttons, stock or quantities.",
    "List",
  ),
  write(
    "Track two terracotta pots on the Potting shelf. Flag at two remaining, value 8, photo lib:plants, details at pots.",
  ),
  {
    ...write(
      "Show my owned stock one row per item, not as photo tiles: one spare lead in Van bin, at minimum two, details at leads.",
    ),
    variant: { axis: "arrange", value: "rows" },
  },
  read("I found one more clay pot. Increase its quantity by one.", {
    address: "t1/r1/qty",
    action: "increment",
  }),
  { ...write("List all my stock records: zero spare leads (opens lead) and one bowl (opens bowl). Only show the missing items, but keep both records."),
    expectProps: { filter: "missing", items: [{ qty: 0 }, { qty: 1 }] } },
  { ...write("Track one seed tray, opens tray, with the exact serial LEDGE-042."),
    expectProps: { items: [{ serial: "LEDGE-042" }] } },
  { ...write("Track one used seed tray, opens tray. Its condition is worn."),
    expectProps: { items: [{ condition: "worn" }] } },
  { ...write("Reconcile my seed trays in a stocktake: expected 10, counted 8. Open trays for details."),
    expectProps: { style: "audit", items: [{ expected: 10, qty: 8 }] } },
  { ...write("Keep a record for one spare lead, opens lead. Add a button to scan a barcode or QR code on the scan_inventory screen."),
    expectProps: { scan: { goto: "scan_inventory" } } },
] satisfies c.Probe[];

type ThingsProps = c.Props<typeof props, typeof meta>;
type Item = ThingsProps["items"][number];

// prettier-ignore
export function Things(input: ThingsProps) {
  const context = kit.usePartContext();
  const { lang, words } = kit.useWords(inventoryWordsFor);
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const arrange = kit.useVariant("arrange", meta.variants.arrange, input.arrange);
  const visible = c.visibleItems<Item>(meta, input);
  const items = visible.length === 0 && context.state === "loading" ? input.items : visible;
  // Keep the exact quantity and both touch targets visible when a tile needs more room.
  const audit = input.style === "audit", stackControls = audit
    ? items.some(({ qty, expected }) => qty > inlineCountMax || expected === undefined || expected > inlineCountMax)
    : arrange === "rows" && items.some(({ serial, condition }) => serial || condition);
  const layout = audit ? "rows" : arrange === "grid" && items.some(({ qty }) => qty > inlineCountMax) ? "wide" : arrange;
  const scan = input.scan && context.state === "filled" && <kit.KitAction
    part="scan" kind="secondary" icon="camera" label={words.things.scan} goto={input.scan.goto} />;
  if (context.state === "empty") return <kit.KitCard part="root" {...{ surface, density }}>
    <kit.KitState part="empty" icon="package" />
  </kit.KitCard>;
  if (!items.length) return <kit.KitCard part="root" {...{ surface, density }}>
    <kit.KitEmpty part="empty" decorativeIcon {...thingsEmpty(input.filter, lang, context.thing)} />
    {scan && <kit.KitActionFooter density={density}>{scan}</kit.KitActionFooter>}
  </kit.KitCard>;
  const loading = context.state === "loading";
  const Tile = loading ? tile.ThingLoading : tile.ThingTile;
  const grid = <kit.KitGrid list listRowGap="cards" density={density} arrange={layout === "grid" ? "grid" : "rows"}>
      {items.map((item, index) => (
        <kit.PartScope key={item.id} {...context} item={item.id}>
          <kit.KitCard part="tile" padded {...{ surface, density }}>
            <Tile {...{ item, density, layout, audit, maxQuantity, stackControls }} peer={layout === "grid" ? items[index % 2 ? index - 1 : index + 1] : undefined} />
          </kit.KitCard>
        </kit.PartScope>
      ))}
    </kit.KitGrid>;
  return <kit.KitCard part="root" style="cards" density={density}>
    {loading && audit ? <kit.KitState loading={grid} density={density} /> : grid}
    {scan && <kit.KitActionFooter density={density}>{scan}</kit.KitActionFooter>}
  </kit.KitCard>;
}
