import { z } from "zod";
import {
  probesFor,
  clip,
  icon,
  itemsOf,
  placeholderTitle,
  placeholderValue,
  text,
  thingOf,
  type FallbackInput,
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
} as const satisfies Meta;

export const props = z.strictObject({
  style: z.enum(["rows", "grid"]).default("rows"),
  pairs: z
    .array(z.strictObject({ label: text(20), value: text(28), icon: icon.optional() }))
    .min(1)
    .max(6),
});

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
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
      : [0, 1].map((index) => ({ label: placeholderTitle(index, lang), value: placeholderValue })),
  };
}

export const examples = [
  {
    style: "rows",
    pairs: [
      { label: "Room", value: "Bathroom", icon: "home" },
      { label: "Bright light", value: "Indirect", icon: "sun" },
      { label: "Water (days)", value: "7", icon: "drop" },
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

const { choose, write } = probesFor("KeyValue");
export const probes = [
  choose("the facts about one plant: room, light, water interval"),
  choose("show all my plants to pick one", "List"),
  write("One plant in the bathroom, bright indirect light, watered every seven days"),
] satisfies Probe[];

type Pair = Props<typeof props, typeof meta>["pairs"][number];

function PairRow({ pair, style }: { pair: Pair; style: "rows" | "grid" }) {
  const label = (
    <KitText role="caption" tone="muted" part="label">
      {pair.label}
    </KitText>
  );
  const value = (
    <KitText
      role={/^\d+(?:\s+\p{L}+)?$/u.test(pair.value) && pair.value.length <= 6 ? "number" : "body"}
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
    >
      {style === "rows" ? (
        <KitGrid>
          {label}
          {value}
        </KitGrid>
      ) : (
        <>
          {label}
          {value}
        </>
      )}
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
              <KitSkeleton key={pair.id} rows={1} shape="pairs" lead={pair.icon ? "dot" : "none"} />
            ))}
          </KitGrid>
        ) : (
          <KitSkeleton rows={pairs.length} shape="pairs" />
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
