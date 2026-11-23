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
} from "../catalog";
import {
  KitCard,
  KitContent,
  KitEmpty,
  KitGrid,
  KitIcon,
  KitRow,
  KitSkeleton,
  KitText,
  useComponentState,
  useKit,
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
  parts: ["root"],
  variants: { arrange: ["grid", "rows"] },
  states: ["filled", "empty", "loading"],
} as const satisfies Meta;

const tileProps = z.strictObject({
  label: text(20).refine(
    (label) =>
      !placeholderTitles.some((title) => title.toLowerCase() === label.replace(/\s+/g, " ").toLowerCase()),
    "Use the name of a measured quantity, not a placeholder",
  ),
  value: text(8).regex(/^[+−-]?(?:\d+(?:[.,]\d+)*|[.,]\d+)$/, "Use a numeric measurement"),
  unit: text(8).optional(),
  trend: z.enum(["up", "down", "flat"]).optional(),
});

export const props = z.strictObject({
  ...variantProps(meta.variants),
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
    tiles: [
      { label: "Plants", value: "12" },
      { label: "Watered", value: "3" },
      { label: "Due", value: "2" },
    ],
  },
  { tiles: walkTiles },
  { arrange: "rows", tiles: walkTiles },
  { tiles: [{ label: "Overdue returns", value: "0" }] },
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
] satisfies Probe[];

type Tile = Props<typeof props, typeof meta>["tiles"][number];

function TileValue({ tile, density, grid }: { tile: Tile; density: ThemeDensity; grid: boolean }) {
  const unit = tile.unit && (
    <KitText role="caption" tone="muted" part="unit" density={density} align={grid ? "start" : "end"}>
      {grid ? " " : ""}
      {tile.unit}
    </KitText>
  );
  const value = (
    <KitText role="number" part="value" align={grid ? "start" : "end"} density={density}>
      {tile.value}
      {grid && unit}
    </KitText>
  );
  return grid ? (
    value
  ) : (
    <>
      {value}
      {unit}
    </>
  );
}

function TileRow({ tile, grid, density }: { tile: Tile; grid: boolean; density: ThemeDensity }) {
  const trend = tile.trend && (
    <KitIcon
      name={tile.trend === "up" ? "trending_up" : tile.trend === "down" ? "trending_down" : "minus"}
      tone={tile.trend === "up" ? "good" : tile.trend === "down" ? "bad" : "muted"}
      scale="sm"
      part="trend"
    />
  );
  const label = (
    <KitContent lead={trend} lineRole="body" density={density}>
      <KitText role="body" tone="muted" part="label" density={density}>
        {tile.label}
      </KitText>
    </KitContent>
  );
  const value = <TileValue {...{ tile, density, grid }} />;
  return (
    <KitRow
      item={tile.id}
      label={tile.label}
      lineRole="number"
      density={grid ? density : "compact"}
      inset={grid ? "none" : "md"}
    >
      {grid ? (
        <>
          {value}
          {label}
        </>
      ) : (
        <KitGrid fitLast density={density}>
          {label}
          {value}
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
          ["number", tile.value],
          ["body", tile.label],
        ]}
      />
    </KitRow>
  );
}

export function Stats({ arrange, tiles }: Props<typeof props, typeof meta>) {
  const state = useComponentState();
  const density = useKit().density;
  const grid = arrange === "grid" && tiles.length !== 1;
  const columns = tiles.length === 3 ? 3 : 2;
  const layout = tiles.length <= 1 ? "rows" : arrange;
  const empty = state === "empty" || (!tiles.length && state !== "loading");
  return (
    <KitCard style="inset" part="root" padded={grid && !empty} density={density}>
      {empty ? (
        <KitEmpty part="label" />
      ) : state === "loading" && (!grid || !tiles.length) ? (
        <KitSkeleton rows={Math.max(1, tiles.length)} lead="none" shape="pairs" density="compact" />
      ) : (
        <KitGrid arrange={layout} {...{ columns, density }}>
          {tiles.map((tile) =>
            state === "loading" ? (
              <TileLoading key={tile.id} {...{ tile, density }} />
            ) : (
              <TileRow key={tile.id} {...{ tile, grid, density }} />
            ),
          )}
        </KitGrid>
      )}
    </KitCard>
  );
}
