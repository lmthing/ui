import { z } from "zod";
import {
  probesFor,
  clip,
  itemsOf,
  placeholderTitle,
  placeholderValue,
  text,
  thingOf,
  variantProps,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
  type ThemeDensity,
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
  useVariant,
} from "../kit";

export const meta = {
  id: "Stats",
  signature: "count_up",
  group: "data",
  purpose: "Two to four independent summary numbers, with labels, units and optional change arrows.",
  pick: "Several independent summary measurements shown together, with an optional change arrow on each. Not amounts compared across days or categories (Bars), one latest measurement with its recent line (Sparkline), one record's details (KeyValue), one headline number (Hero), or one sum of money (Amount).",
  writeHints: [
    'Leave density and arrange null unless explicitly requested. For one metric per line with its label on the left and number on the right, set arrange "rows".',
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Aggregates over records in the on-device database.",
  items: { key: "tiles", parts: ["root", "value", "unit", "label", "trend"] },
  parts: ["root"],
  variants: { density: ["comfortable", "compact"], arrange: ["grid", "rows"] },
  states: ["filled", "empty", "loading"],
} as const satisfies Meta;

export const props = z.strictObject({
  ...variantProps(meta.variants),
  tiles: z
    .array(
      z.strictObject({
        label: text(20),
        value: text(8),
        unit: text(8).optional(),
        trend: z.enum(["up", "down", "flat"]).optional(),
      }),
    )
    .min(2)
    .max(4),
});

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
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
        return label && /^[+-]?(?:\d+(?:[.,]\d+)*|\.\d+)$/.test(value)
          ? [{ label, value: clip(value, 8) }]
          : [];
      });
    })
    .slice(0, 2);
  while (tiles.length < 2) {
    tiles.push({ label: placeholderTitle(tiles.length, lang), value: placeholderValue });
  }
  return { tiles };
}

export const examples = [
  {
    tiles: [
      { label: "Plants", value: "12" },
      { label: "Watered", value: "3" },
      { label: "Due", value: "2" },
    ],
  },
  {
    arrange: "rows",
    tiles: [
      { label: "Walks this week", value: "9", trend: "flat" },
      { label: "Earned", value: "180", unit: "EUR", trend: "up" },
    ],
  },
  {
    density: "compact",
    tiles: [
      { label: "Walks", value: "8", trend: "down" },
      { label: "Clients", value: "4" },
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
] satisfies Probe[];

type Tile = Props<typeof props, typeof meta>["tiles"][number];

function TileValue({
  tile,
  density,
  align = "start",
}: {
  tile: Tile;
  density: ThemeDensity;
  align?: "start" | "end";
}) {
  return (
    <KitText role="number" part="value" align={align} density={density}>
      {tile.value}
      {tile.unit && (
        <KitText role="caption" tone="muted" part="unit" density={density}>
          {" "}
          {tile.unit}
        </KitText>
      )}
    </KitText>
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
  return (
    <KitRow
      item={tile.id}
      label={tile.label}
      lineRole="number"
      density={density}
      inset={grid ? "none" : "md"}
      trailing={!grid ? <TileValue tile={tile} density={density} align="end" /> : undefined}
    >
      {grid && <TileValue tile={tile} density={density} />}
      <KitContent lead={trend} lineRole="body" density={density}>
        <KitText role="body" tone="muted" part="label" density={density}>
          {tile.label}
        </KitText>
      </KitContent>
    </KitRow>
  );
}

// prettier-ignore
export function Stats({ arrange, tiles, density: requested }: Props<typeof props, typeof meta>) {
  const state = useComponentState();
  const density = useVariant("density", meta.variants.density, requested);
  const grid = arrange === "grid";
  const columns = tiles.length === 3 ? 3 : 2;
  return <KitCard style="inset" part="root" padded={grid && state !== "empty"} density={density}>
    {state === "empty" ? <KitEmpty part="label" /> :
      state === "loading" && !grid ? <KitSkeleton rows={tiles.length} lead="none" shape="pairs" density={density} /> :
      <KitGrid {...{ arrange, columns, density }}>
        {tiles.map((tile) => state === "loading"
          ? <KitSkeleton key={tile.id} rows={1} lead="none" shape="headline" inset="none" density={density} />
          : <TileRow key={tile.id} {...{ tile, grid, density }} />)}
      </KitGrid>}
  </KitCard>;
}
