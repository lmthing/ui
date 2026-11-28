import { z } from "zod";
import {
  probesFor,
  clip,
  itemsOf,
  placeholderTitles,
  text,
  thingOf,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
  type ThemeDensity,
  variantProps,
  wordsFor,
} from "../catalog";
import { statsUnavailable } from "../catalog/lang/en/Stats";
import {
  KitCard,
  KitContent,
  KitEmpty,
  KitGrid,
  KitRow,
  KitSkeleton,
  KitText,
  useComponentState,
  useKit,
  useWords,
  PartScope,
  usePartContext,
} from "../kit";
import { prompt } from "../entry/prompt-Stats.generated";

export const meta = {
  id: "Stats",
  status: "ready",
  signature: "count_up",
  group: "data",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Aggregates over records in the on-device database.",
  items: { key: "tiles", parts: ["root", "value", "unit", "label", "trend"] },
  parts: ["root", "period", "label"],
  variants: { arrange: ["grid", "rows"] },
  states: ["filled", "empty", "loading"],
  readInState: (_input, state) => state === "empty",
  read: (input, state, lang): string[] => {
    const { tiles = [] } = input as { tiles?: (z.output<typeof tileProps> & { id?: string })[] };
    if (state === "empty" || (state === "filled" && !tiles.length)) return [statsUnavailable];
    return state === "filled"
      ? tiles.flatMap((tile, index) =>
          tile.trend ? [`${tile.id ?? `r${index + 1}`} ${trendLabel(tile.trend, lang)}`] : [],
        )
      : [];
  },
} as const satisfies Meta;

// Keep older display-ready percentages, currency and grouped figures. Never accept prose as a figure.
const measurement =
  /^[+−-]?\p{Sc}?(?:\d{1,3}(?:[ \u00a0\u202f]\d{3})+(?:[.,]\d+)?|\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?|[.,]\d+)(?:[ \u00a0\u202f]?[%‰\p{Sc}])?$/u;
const tileProps = z.strictObject({
  label: text(20).refine(
    (label) =>
      !placeholderTitles.some((title) => title.toLowerCase() === label.replace(/\s+/g, " ").toLowerCase()),
    "Use the name of a measured quantity, not a placeholder",
  ),
  value: text(8).refine((value) => measurement.test(value), "Use a numeric measurement"),
  unit: text(8).optional(),
  trend: z.enum(["up", "down", "flat"]).optional(),
});

export const props = z.strictObject({
  ...variantProps(meta.variants),
  period: text(36).optional(),
  tiles: z.array(tileProps).max(4).meta({ repair: "drop_invalid_items" }),
});

export function fallback({ cast }: FallbackInput): z.input<typeof props> {
  const tiles = itemsOf(cast, 2)
    .flatMap((item) => {
      const fields =
        thingOf(cast, item.type)?.fields ??
        Object.keys(item).filter((field) => !["id", "type", "sample"].includes(field));
      return fields.flatMap((field) => {
        const raw = item[field];
        const value =
          typeof raw === "number" && Number.isFinite(raw)
            ? String(raw)
            : typeof raw === "string"
              ? raw.trim()
              : "";
        const readable = field
          .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
          .replace(/[_-]+/g, " ")
          .trim();
        const label = clip(readable.charAt(0).toUpperCase() + readable.slice(1), 20);
        const tile = tileProps.safeParse({ label, value });
        return tile.success ? [tile.data] : [];
      });
    })
    .slice(0, 2);
  return { tiles };
}

const walkTiles = [
  { label: "Walks", value: "9", trend: "flat" },
  { label: "Earned", value: "90", unit: "EUR", trend: "up" },
] satisfies z.input<typeof props>["tiles"];

export const examples = [
  {
    period: "Today",
    tiles: [
      { label: "Soil checks", value: "12" },
      { label: "Watered", value: "3" },
      { label: "Still due", value: "2" },
    ],
  },
  { period: "This week", tiles: walkTiles },
  { arrange: "rows", period: "This week", tiles: walkTiles },
  { period: "April 2026", tiles: [{ label: "Overdue returns", value: "0" }] },
  {
    arrange: "rows",
    period: "April 2026",
    tiles: [
      { label: "Projected cash flow", value: "−125,400", unit: "EUR", trend: "down" },
      { label: "Available credit", value: "995,000", unit: "EUR" },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write } = probesFor("Stats");
export const probes = [
  choose("Show how many plants I have, how many I watered today and how many are due"),
  choose("Show the room and water interval of one plant", "KeyValue"),
  write("Show nine walks this week and 180 EUR earned, with earnings trending up"),
  {
    ...write(
      "Show two summary measurements: Walks 9 and Earnings 180 EUR. Show one per line with the label on the left and the number on the right.",
    ),
    variant: { axis: "arrange", value: "rows" },
  },
  {
    ...write("Show the measured total Returns: 0. The exchange count is unavailable, so omit its tile."),
    expectProps: { tiles: [{ label: "Returns", value: "0" }] },
  },
  {
    ...write("For April 2026, show 12 plants watered and 3 repotted. Put April 2026 above both totals."),
    fields: { period: "April 2026" },
  },
] satisfies Probe[];

type Tile = Props<typeof props, typeof meta>["tiles"][number];

function trendLabel(trend: NonNullable<z.output<typeof tileProps>["trend"]>, lang?: string) {
  return wordsFor(lang).trend[trend === "up" ? "rising" : trend === "down" ? "falling" : "steady"];
}

function TileValue({ tile, density, grid }: { tile: Tile; density: ThemeDensity; grid: boolean }) {
  const { signature: _signature, ...scope } = usePartContext();
  const align = grid ? "start" : "end";
  // Legacy count_up remains a valid screen choice, but never substitutes an invented measurement.
  const unit = tile.unit && (
    <KitText role="caption" tone="muted" part="unit" {...{ density, align }} breakLongWords>
      {tile.unit}
    </KitText>
  );
  return (
    <>
      <PartScope {...scope}>
        <KitText
          role="number"
          part="value"
          numberScale={grid ? "display" : "compact"}
          {...{ density, align }}
          tabular
          breakLongWords
        >
          {grid && unit ? (
            <>
              {tile.value} {unit}
            </>
          ) : (
            tile.value
          )}
        </KitText>
      </PartScope>
      {!grid && unit}
    </>
  );
}

function TileRow({
  tile,
  grid,
  density,
  padded,
}: {
  tile: Tile;
  grid: boolean;
  density: ThemeDensity;
  padded: boolean;
}) {
  const { lang } = useWords();
  const trend = tile.trend && (
    <KitText
      role="caption"
      tone={tile.trend === "up" ? "good" : tile.trend === "down" ? "bad" : "muted"}
      part="trend"
      density={density}
    >
      {trendLabel(tile.trend, lang)}
    </KitText>
  );
  const label = (
    <KitContent lineRole="body" rhythm="flush" density={density}>
      <KitText role="body" tone="muted" part="label" density={density} breakLongWords>
        {tile.label}
      </KitText>
      {trend}
    </KitContent>
  );
  const value = <TileValue {...{ tile, density, grid }} />;
  return (
    <KitRow
      item={tile.id}
      label={tile.label}
      lineRole={grid ? "number" : "body"}
      density={grid ? density : "compact"}
      inset={padded ? "none" : "md"}
    >
      {grid ? (
        <KitContent lineRole="body" density={density}>
          {value}
          {label}
        </KitContent>
      ) : (
        <KitGrid density={density}>
          {label}
          <KitContent lineRole="body" rhythm="flush" density={density}>
            {value}
          </KitContent>
        </KitGrid>
      )}
    </KitRow>
  );
}

function TileLoading({ tile, density }: { tile: Tile; density: ThemeDensity }) {
  return (
    <KitRow label={tile.label} part={null} inset="none" density={density}>
      <KitSkeleton
        shape="figure"
        inset="none"
        density={density}
        content={[
          ["number", tile.unit ? `${tile.value} ${tile.unit}` : tile.value],
          ["body", tile.label],
          ["caption", tile.trend && trendLabel(tile.trend)],
        ]}
      />
    </KitRow>
  );
}

// Entry and exit cut. A changed standalone figure rolls via KitText; a grid figure with an inline
// unit cuts to keep the measurement together. Labels, units and period stay put. No focus or action
// is owned here; the host can announce a confirmed refresh. Reduced motion cuts to the exact value.
export function Stats({ arrange, period, tiles }: Props<typeof props, typeof meta>) {
  const state = useComponentState();
  const density = useKit().density;
  const grid = arrange === "grid" && tiles.length !== 1;
  const columns = tiles.length === 3 && tiles.every((tile) => tile.value.length <= 5) ? 3 : 2;
  const layout = tiles.length <= 1 ? "rows" : arrange;
  const empty = state === "empty" || (!tiles.length && state !== "loading");
  const padded = Boolean(period) || (!empty && grid);
  return (
    <KitCard style="inset" part="root" padded={padded} density={density}>
      {period && (
        <KitText role="body" part="period" density={density} breakLongWords>
          {period}
        </KitText>
      )}
      {empty ? (
        <KitEmpty part="label" title={statsUnavailable} icon="bar_chart" prominence="body" decorativeIcon />
      ) : state === "loading" && (!grid || !tiles.length) ? (
        <KitSkeleton
          rows={Math.max(1, tiles.length)}
          lead="none"
          shape="pairs"
          density="compact"
          inset={padded ? "none" : "md"}
        />
      ) : (
        <KitGrid arrange={layout} {...{ columns, density }}>
          {tiles.map((tile) =>
            state === "loading" ? (
              <TileLoading key={tile.id} {...{ tile, density }} />
            ) : (
              <TileRow key={tile.id} {...{ tile, grid, density, padded }} />
            ),
          )}
        </KitGrid>
      )}
    </KitCard>
  );
}
