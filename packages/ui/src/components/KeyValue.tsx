import { z } from "zod";
import {
  clip,
  icon,
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
import { KitCard, KitGrid, KitIcon, KitRow, KitSkeleton, KitText, useComponentState, KitEmpty } from "../kit";

export const meta = {
  id: "KeyValue",
  group: "content",
  purpose: "Label and value details of one single thing, like its room or schedule.",
  pick: "Any need about one thing's details or settings. Not several separate things (List) or summary numbers (Stats).",
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Fields of one record in the on-device database.",
  items: { key: "pairs", parts: ["root", "label", "value", "icon"] },
  states: ["filled", "empty", "loading"],
  aliases: ["attributes", "details", "properties", "specifications"],
} as const satisfies Meta;

export const props = z.strictObject({
  style: z.enum(["rows", "grid"]).default("rows"),
  pairs: z
    .array(z.strictObject({ label: text(20), value: text(28), icon: icon.optional() }))
    .min(1)
    .max(6),
});

export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  const thing = thingOf(cast);
  const item = itemsOf(cast, 1)[0];
  const pairs = (thing?.fields ?? [])
    .flatMap((field) => {
      const value = item?.[field];
      const readable = field
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .replace(/[_-]+/g, " ")
        .trim();
      const label = clip(readable.charAt(0).toUpperCase() + readable.slice(1), 20);
      return label && typeof value === "string" && value.trim()
        ? [{ label, value: clip(value.trim(), 28) }]
        : [];
    })
    .slice(0, 4);
  return {
    style: "rows",
    pairs: pairs.length
      ? pairs
      : [0, 1].map((index) => ({ label: placeholderTitle(index), value: placeholderValue })),
  };
}

export const examples = [
  {
    style: "rows",
    pairs: [
      { label: "Room", value: "Bathroom", icon: "home" },
      { label: "Light", value: "Bright, indirect", icon: "sun" },
      { label: "Water", value: "7 days", icon: "drop" },
      { label: "Last watered", value: "Mon, 16 Nov", icon: "calendar" },
    ],
  },
  {
    style: "grid",
    pairs: [
      { label: "Breed", value: "Labrador", icon: "dog" },
      { label: "Walks a week", value: "5" },
      { label: "Owner", value: "Alex", icon: "user" },
      { label: "Notes", value: "Quiet parks" },
    ],
  },
] satisfies z.input<typeof props>[];

export const probes = [
  {
    kind: "choose",
    need: "the facts about one plant: room, light, water interval",
    expect: "KeyValue",
  },
  { kind: "choose", need: "show all my plants to pick one", expect: "List" },
  {
    kind: "write",
    brief: "One plant in the bathroom, bright indirect light, watered every seven days",
    expect: "KeyValue",
  },
] satisfies Probe[];

type Pair = Props<typeof props, typeof meta>["pairs"][number];

function PairRow({ pair, style }: { pair: Pair; style: "rows" | "grid" }) {
  const value = (
    <KitText
      role={/^\d+(?:\s+\p{L}+)?$/u.test(pair.value) && pair.value.length <= 6 ? "number" : "body"}
      align={style === "rows" ? "end" : "start"}
      part="value"
    >
      {pair.value}
    </KitText>
  );
  return (
    <KitRow
      item={pair.id}
      label={pair.label}
      leading={pair.icon ? <KitIcon name={pair.icon} tone="muted" part="icon" /> : undefined}
      trailing={style === "rows" ? value : undefined}
    >
      <KitText role="caption" tone="muted" part="label">
        {pair.label}
      </KitText>
      {style === "grid" && value}
    </KitRow>
  );
}

export function KeyValue({ style, pairs }: Props<typeof props, typeof meta>) {
  const state = useComponentState();
  if (state === "loading") {
    return (
      <KitCard style="inset">
        {style === "grid" ? (
          <KitGrid>
            {pairs.map((pair) => (
              <KitSkeleton key={pair.id} rows={1} />
            ))}
          </KitGrid>
        ) : (
          <KitSkeleton rows={pairs.length} />
        )}
      </KitCard>
    );
  }
  if (state === "empty") {
    return (
      <KitCard style="inset">
        <KitEmpty part="label" />
      </KitCard>
    );
  }
  return (
    <KitCard style="inset" part="root">
      {style === "grid" ? (
        <KitGrid>
          {pairs.map((pair) => (
            <PairRow key={pair.id} pair={pair} style={style} />
          ))}
        </KitGrid>
      ) : (
        pairs.map((pair) => <PairRow key={pair.id} pair={pair} style={style} />)
      )}
    </KitCard>
  );
}
