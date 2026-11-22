import { z } from "zod";
import type { ReactNode } from "react";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import {
  inlineCountMax,
  isLowStock,
  matchesThingFilter,
  thingCopy,
  thingMetadata,
  thingsEmpty,
  thingsReading,
} from "../copy";
import { inventoryWordsFor } from "../lang";
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
  variants: { arrange: ["grid", "rows"] },
  parts: ["root", "empty", "scan", "scan_label", "scan_icon"],
  partTiers: { scan: "ok" },
  items: {
    key: "items",
    parts: [
      "tile",
      "root",
      "name",
      "photo",
      "qty",
      "where",
      "value",
      "low",
      "serial",
      "condition",
      "expected",
      "counted",
    ],
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

const ledge = [
  { name: "Clay pot", photo: "lib:plants", qty: 2, min: 2, where: "Potting shelf", value: 8, goto: "pots" },
  {
    name: "Seed tray",
    photo: "lib:seed_tray",
    qty: 8,
    min: 2,
    where: "Greenhouse",
    value: 12,
    goto: "trays",
  },
] satisfies [z.input<typeof item>, z.input<typeof item>];
export const examples = [
  { items: ledge },
  {
    filter: "low",
    items: [
      { name: "Bag roll", qty: 1, min: 2, where: "Van bin", value: 3, goto: "bags" },
      { name: "Bowl", photo: "lib:dogs", qty: 0, min: 1, where: "Kit cupboard", value: 9, goto: "bowls" },
    ],
  },
  { arrange: "rows", items: ledge },
  {
    filter: "missing",
    items: [{ name: "Spare lead", qty: 0, where: "Van bin", goto: "lead" }],
    scan: { goto: "scan_inventory" },
  },
  { items: [{ ...ledge[0], serial: "LEDGE-042", condition: "worn" }, ledge[1]] },
  {
    style: "audit",
    items: [
      { name: "Seed tray", qty: 8, expected: 10, goto: "trays", where: "Greenhouse" },
      { name: "Clay pot", qty: 2, expected: 2, goto: "pots" },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Things");
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
  {
    ...write(
      "List all my stock records: zero spare leads (opens lead) and one bowl (opens bowl). Only show the missing items, but keep both records.",
    ),
    expectProps: { filter: "missing", items: [{ qty: 0 }, { qty: 1 }] },
  },
  {
    ...write("Track one seed tray, opens tray, with the exact serial LEDGE-042."),
    expectProps: { items: [{ serial: "LEDGE-042" }] },
  },
  {
    ...write("Track one used seed tray, opens tray. Its condition is worn."),
    expectProps: { items: [{ condition: "worn" }] },
  },
  {
    ...write("Reconcile my seed trays in a stocktake: expected 10, counted 8. Open trays for details."),
    expectProps: { style: "audit", items: [{ expected: 10, qty: 8 }] },
  },
  {
    ...write(
      "Keep a record for one spare lead, opens lead. Add a button to scan a barcode or QR code on the scan_inventory screen.",
    ),
    expectProps: { scan: { goto: "scan_inventory" } },
  },
] satisfies c.Probe[];

type ThingsProps = c.Props<typeof props, typeof meta>;
type Item = ThingsProps["items"][number];

type TileProps = {
  item: Item;
  peer: Item | undefined;
  layout: "rows" | "grid" | "wide";
  density: c.ThemeDensity;
  audit: boolean;
  stackControls: boolean;
  maxQuantity: number;
};

function ThingDetails({ item, peer, density }: Pick<TileProps, "item" | "peer" | "density">) {
  const { lang } = kit.useWords(inventoryWordsFor);
  const [condition, serial] = thingMetadata(item, lang);
  return (
    <kit.KitMetaLine
      title={{
        text: condition.text ?? (peer?.condition ? "\u00a0" : undefined),
        part: condition.text ? condition.part : null,
        role: "caption",
        tone: item.condition === "damaged" ? "warn" : "muted",
      }}
      meta={{
        text: serial.text ?? (peer?.serial ? "\u00a0" : undefined),
        part: serial.text ? serial.part : null,
        role: "caption",
      }}
      density={density}
    />
  );
}

function AuditCounts({
  item,
  density,
  stepper,
  stackControls,
}: Pick<TileProps, "item" | "density" | "stackControls"> & { stepper: ReactNode }) {
  const {
    lang,
    words: { things: words },
  } = kit.useWords(inventoryWordsFor);
  const label = { text: words.expected, role: "caption", tone: "muted" } as const;
  const value = {
    text: item.expected === undefined ? undefined : c.numberLine(item.expected, lang),
    part: "expected",
    role: "figure",
    compact: true,
    tabular: true,
  } as const;
  const expected = value.text && (
    <kit.KitContent density={density}>
      <kit.KitLayoutText line={label} density={density} />
      <kit.KitLayoutText line={value} density={density} />
    </kit.KitContent>
  );
  const counted = (
    <kit.KitContent density={density}>
      <kit.KitLayoutText
        line={{ text: words.counted, part: "counted", role: "caption", tone: "muted" }}
        density={density}
      />
      {stepper}
    </kit.KitContent>
  );
  return stackControls ? (
    <kit.KitRowGroup separators={false} spacing="groups" density={density}>
      {expected}
      {counted}
    </kit.KitRowGroup>
  ) : (
    <kit.KitGrid density={density}>
      <kit.KitContent density={density}>
        <kit.KitLayoutText line={label} align="end" density={density} />
        <kit.KitRow
          part={null}
          inline
          surface="plain"
          label=""
          trailing={<kit.KitLayoutText line={value} align="end" density={density} />}
          leadingAlign="row"
        >
          {null}
        </kit.KitRow>
      </kit.KitContent>
      {counted}
    </kit.KitGrid>
  );
}

function ThingStock(
  value: ReturnType<typeof thingCopy>["value"],
  low: ReturnType<typeof thingCopy>["low"],
  separator: string,
  density: c.ThemeDensity,
) {
  return (
    <kit.KitText part={null} role="body" density={density}>
      {value && (
        <kit.KitText
          part="value"
          role="number"
          numberScale="compact"
          tone="muted"
          emphasis="quiet"
          tabular
          density={density}
        >
          {value}
        </kit.KitText>
      )}
      {value && low && separator}
      {low && (
        <kit.KitText part="low" role="caption" tone="warn" density={density}>
          {low}
        </kit.KitText>
      )}
      {!value && !low && "\u00a0"}
    </kit.KitText>
  );
}

function ThingTileDetails(
  { item, peer, density }: Pick<TileProps, "item" | "peer" | "density">,
  { rows, audit, photo }: { rows: boolean; audit: boolean; photo: ReactNode },
  { value, low }: Pick<ReturnType<typeof thingCopy>, "value" | "low">,
  separator: string,
) {
  const stockLine = value || low || peer?.value !== undefined || (peer && isLowStock(peer));
  const singleAuditLine = audit && !item.where && !stockLine && !item.serial && !item.condition;
  return (
    <kit.KitRow part="root" goto={item.goto} label={item.name} density={density} inline>
      <kit.KitContent
        density={rows ? "comfortable" : density}
        lead={rows ? photo : undefined}
        leadingAlign={singleAuditLine ? "line" : "row"}
        lineRole="body"
      >
        {!rows && photo}
        <kit.KitText part="name" role="body" density={density}>
          {item.name}
        </kit.KitText>
        {(item.where || peer?.where) && (
          <kit.KitText part={item.where ? "where" : null} role="caption" tone="muted" density={density}>
            {item.where ?? "\u00a0"}
          </kit.KitText>
        )}
        {stockLine && ThingStock(value, low, separator, density)}
        <ThingDetails {...{ item, peer, density }} />
      </kit.KitContent>
    </kit.KitRow>
  );
}

function ThingTile({ item, peer, layout, density, audit, maxQuantity, stackControls }: TileProps) {
  const rows = layout === "rows";
  const { lang, words } = kit.useWords(inventoryWordsFor);
  const { value, low, initials } = thingCopy(item, lang);
  const photo = (
    <kit.KitPhoto
      part="photo"
      label={item.name}
      initials={initials}
      {...(item.photo ? { photo: item.photo } : {})}
      {...(rows ? { shape: "thumb" } : { aspect: "wide" })}
    />
  );
  const labels = { less: words.things.less(item.name), more: words.things.more(item.name) };
  const stepper = <kit.KitStepper part="qty" value={item.qty} min={0} max={maxQuantity} labels={labels} />;
  const detail = ThingTileDetails(
    { item, peer, density },
    { rows, audit, photo },
    { value, low },
    words.things.priceStockSeparator,
  );
  if (audit)
    return (
      <>
        {detail}
        <AuditCounts {...{ item, density, stepper, stackControls }} />
      </>
    );
  if (rows && item.qty <= inlineCountMax && !stackControls)
    return (
      <kit.KitGrid fitLast density="compact">
        {detail}
        {stepper}
      </kit.KitGrid>
    );
  return (
    <>
      {detail}
      <kit.KitContent group={density === "compact" ? "content" : "response"} density={density}>
        {stepper}
      </kit.KitContent>
    </>
  );
}

function ThingCountLoading(quantity: ReturnType<typeof thingCopy>["quantity"]) {
  const button = <kit.KitSkeleton shape="control" kind="secondary" inset="none" />;
  const count = (
    <kit.KitSkeleton shape="figure" inset="none" content={[["number", quantity, "center", "compact"]]} />
  );
  return (
    <kit.KitRow
      part={null}
      inline
      surface="plain"
      label=""
      leading={button}
      leadingAlign="row"
      density="compact"
    >
      <kit.KitRow
        part={null}
        inline
        surface="plain"
        label=""
        leading={count}
        leadingAlign="row"
        density="compact"
      >
        {button}
      </kit.KitRow>
    </kit.KitRow>
  );
}

function ThingLoading({ item, peer, layout, density, audit, stackControls }: TileProps) {
  const rows = layout === "rows";
  const { lang, words } = kit.useWords(inventoryWordsFor);
  const { value, low, quantity } = thingCopy(item, lang);
  const stock = [value, low].filter(Boolean).join(words.things.priceStockSeparator);
  const reserveStock = peer?.value !== undefined || (peer && isLowStock(peer));
  const detail = (
    <kit.KitSkeleton
      shape="figure"
      lead={rows ? "box" : "none"}
      inset="none"
      density={density}
      content={[
        ["body", item.name],
        ["caption", item.where],
        ["body", stock || undefined],
        ...(layout === "grid"
          ? []
          : thingMetadata(item, lang).map<["caption", string | undefined]>(({ text }) => ["caption", text])),
      ]}
    />
  );
  const controls = ThingCountLoading(quantity);
  if (audit)
    return (
      <>
        {detail}
        <AuditCounts {...{ item, density, stackControls }} stepper={controls} />
      </>
    );
  if (rows && item.qty <= inlineCountMax && !stackControls)
    return (
      <kit.KitGrid fitLast density={density}>
        {detail}
        {controls}
      </kit.KitGrid>
    );
  return (
    <>
      {!rows && <kit.KitSkeleton shape="media" aspect="wide" content={[]} inset="none" density={density} />}
      <kit.KitContent density={density}>
        {detail}
        {!stock && reserveStock && (
          <kit.KitText role="body" part={null} density={density}>
            {"\u00a0"}
          </kit.KitText>
        )}
        {layout === "grid" && <ThingDetails {...{ item, peer, density }} />}
      </kit.KitContent>
      <kit.KitContent group={density === "compact" ? "content" : "response"} density={density}>
        {controls}
      </kit.KitContent>
    </>
  );
}

function thingsLayout(items: Item[], arrange: ThingsProps["arrange"], audit: boolean) {
  // Keep the exact quantity and both touch targets visible when a tile needs more room.
  const stackControls = audit
    ? items.some(
        ({ qty, expected }) => qty > inlineCountMax || expected === undefined || expected > inlineCountMax,
      )
    : arrange === "rows" && items.some(({ serial, condition }) => serial || condition);
  const layout = audit
    ? "rows"
    : arrange === "grid" && items.some(({ qty }) => qty > inlineCountMax)
      ? "wide"
      : arrange;
  return { layout, stackControls } as const;
}

export function Things(input: ThingsProps) {
  const context = kit.usePartContext();
  const { lang, words } = kit.useWords(inventoryWordsFor);
  const density = kit.useKit().density;
  const surface = "card";
  const arrange = kit.useVariant("arrange", meta.variants.arrange, input.arrange);
  const visible = c.visibleItems<Item>(meta, input);
  const items = visible.length === 0 && context.state === "loading" ? input.items : visible;
  const audit = input.style === "audit";
  const { layout, stackControls } = thingsLayout(items, arrange, audit);
  const scan = input.scan && context.state === "filled" && (
    <kit.KitAction
      part="scan"
      kind="secondary"
      icon="camera"
      label={words.things.scan}
      goto={input.scan.goto}
    />
  );
  if (context.state === "empty")
    return (
      <kit.KitCard part="root" {...{ surface, density }}>
        <kit.KitState part="empty" icon="package" />
      </kit.KitCard>
    );
  if (!items.length)
    return (
      <kit.KitCard part="root" {...{ surface, density }}>
        <kit.KitEmpty part="empty" decorativeIcon {...thingsEmpty(input.filter, lang, context.thing)} />
        {scan && <kit.KitActionFooter density={density}>{scan}</kit.KitActionFooter>}
      </kit.KitCard>
    );
  const loading = context.state === "loading";
  const Tile = loading ? ThingLoading : ThingTile;
  const grid = (
    <kit.KitGrid list listRowGap="cards" density={density} arrange={layout === "grid" ? "grid" : "rows"}>
      {items.map((item, index) => (
        <kit.PartScope key={item.id} {...context} item={item.id}>
          <kit.KitCard part="tile" padded {...{ surface, density }}>
            <Tile
              {...{ item, density, layout, audit, maxQuantity, stackControls }}
              peer={layout === "grid" ? items[index % 2 ? index - 1 : index + 1] : undefined}
            />
          </kit.KitCard>
        </kit.PartScope>
      ))}
    </kit.KitGrid>
  );
  return (
    <kit.KitCard part="root" style="cards" density={density}>
      {loading && audit ? <kit.KitState loading={grid} density={density} /> : grid}
      {scan && <kit.KitActionFooter density={density}>{scan}</kit.KitActionFooter>}
    </kit.KitCard>
  );
}
