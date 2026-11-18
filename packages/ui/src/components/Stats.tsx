import { z } from "zod";
import {
  clip,
  itemsOf,
  placeholderTitle,
  placeholderValue,
  text,
  thingOf,
  type CastLike,
  type Meta,
  type Probe,
  type Props,
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
} from "../kit";

export const meta = {
  id: "Stats",
  signature: "count_up",
  group: "data",
  purpose: "Two to four independent summary numbers, with labels, units and optional change arrows.",
  pick: "Several independent summary measurements shown together, with an optional change arrow on each. Not amounts compared across days or categories (Bars), one latest measurement with its recent line (Sparkline), one record's details (KeyValue), one headline number (Hero), or one sum of money (Amount).",
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Aggregates over records in the on-device database.",
  items: { key: "tiles", parts: ["root", "value", "unit", "label", "trend"] },
  parts: ["root"],
  states: ["filled", "empty", "loading"],
  aliases: ["metrics", "totals", "figures"],
} as const satisfies Meta;

export const props = z.strictObject({
  style: z.enum(["tiles", "inline"]).default("tiles"),
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

export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
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
    tiles.push({ label: placeholderTitle(tiles.length), value: placeholderValue });
  }
  return { style: "tiles", tiles };
}

export const examples = [
  {
    style: "tiles",
    tiles: [
      { label: "Plants", value: "12" },
      { label: "Watered", value: "3" },
      { label: "Due", value: "2" },
    ],
  },
  {
    style: "inline",
    tiles: [
      { label: "Walks this week", value: "9", trend: "flat" },
      { label: "Earned", value: "180", unit: "EUR", trend: "up" },
    ],
  },
] satisfies z.input<typeof props>[];

export const probes = [
  {
    kind: "choose",
    need: "Show how many plants I have, how many I watered today and how many are due",
    expect: "Stats",
  },
  { kind: "choose", need: "Show the room and water interval of one plant", expect: "KeyValue" },
  {
    kind: "write",
    brief: "Show nine walks this week and 180 EUR earned, with earnings trending up",
    expect: "Stats",
  },
] satisfies Probe[];

type Tile = Props<typeof props, typeof meta>["tiles"][number];

function TileValue({ tile, align = "start" }: { tile: Tile; align?: "start" | "end" }) {
  return (
    <KitText role="number" part="value" align={align}>
      {tile.value}
      {tile.unit && (
        <KitText role="caption" tone="muted" part="unit">
          {" "}
          {tile.unit}
        </KitText>
      )}
    </KitText>
  );
}

function TileRow({ tile, style }: { tile: Tile; style: "tiles" | "inline" }) {
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
      inset={style === "tiles" ? "none" : "md"}
      trailing={style === "inline" ? <TileValue tile={tile} align="end" /> : undefined}
    >
      {style === "tiles" && <TileValue tile={tile} />}
      <KitContent lead={trend} lineRole="body">
        <KitText role="body" tone="muted" part="label">
          {tile.label}
        </KitText>
      </KitContent>
    </KitRow>
  );
}

export function Stats({ style, tiles }: Props<typeof props, typeof meta>) {
  const state = useComponentState();
  const columns = tiles.length === 3 ? 3 : 2;
  if (state === "loading") {
    return (
      <KitCard style="inset" part="root" padded={style === "tiles"}>
        {style === "tiles" ? (
          <KitGrid columns={columns}>
            {tiles.map((tile) => (
              <KitSkeleton key={tile.id} rows={1} lead="none" shape="headline" inset="none" />
            ))}
          </KitGrid>
        ) : (
          <KitSkeleton rows={tiles.length} lead="none" shape="pairs" />
        )}
      </KitCard>
    );
  }
  if (state === "empty") {
    return (
      <KitCard style="inset" part="root">
        <KitEmpty part="label" />
      </KitCard>
    );
  }
  return (
    <KitCard style="inset" part="root" padded={style === "tiles"}>
      {style === "tiles" ? (
        <KitGrid columns={columns}>
          {tiles.map((tile) => (
            <TileRow key={tile.id} tile={tile} style={style} />
          ))}
        </KitGrid>
      ) : (
        tiles.map((tile) => <TileRow key={tile.id} tile={tile} style={style} />)
      )}
    </KitCard>
  );
}
