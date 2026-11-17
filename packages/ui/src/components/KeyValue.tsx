import { z } from "zod";
import {
  clip,
  emptyLine,
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
import { KitCard, KitIcon, KitRow, KitSkeleton, KitText, useComponentState, useEmptyThing } from "../kit";

export const meta = {
  id: "KeyValue",
  group: "content",
  purpose: "The labelled facts about one thing.",
  pick: "Read the attributes of one thing. Not several things to choose among (List) or summary numbers (Stats).",
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Fields of one record in the on-device database.",
  items: { key: "pairs", parts: ["root", "label", "value", "icon"] },
  states: ["filled", "empty", "loading"],
  aliases: ["facts", "attributes", "details", "properties"],
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
      { label: "Water every", value: "7 days", icon: "drop" },
      { label: "Last watered", value: "Monday, 16 November", icon: "calendar" },
    ],
  },
  {
    style: "grid",
    pairs: [
      { label: "Breed", value: "Labrador", icon: "dog" },
      { label: "Walks a week", value: "5" },
      { label: "Owner", value: "Alex Morgan", icon: "user" },
      { label: "Notes", value: "Prefers quiet park paths" },
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

function PairRow({ pair, next }: { pair: Pair; next?: Pair | undefined }) {
  return (
    <KitRow
      item={pair.id}
      label={pair.label}
      leading={pair.icon ? <KitIcon name={pair.icon} part="icon" /> : undefined}
      trailing={next ? <PairRow pair={next} /> : undefined}
    >
      <KitText role="caption" tone="muted" part="label">
        {pair.label}
      </KitText>
      <KitText role="body" part="value">
        {pair.value}
      </KitText>
    </KitRow>
  );
}

export function KeyValue({ style, pairs }: Props<typeof props, typeof meta>) {
  const state = useComponentState();
  const thing = useEmptyThing();
  if (state === "loading") {
    return (
      <KitCard style="inset">
        <KitSkeleton rows={style === "grid" ? 2 : 4} />
      </KitCard>
    );
  }
  if (state === "empty") {
    return (
      <KitCard style="inset">
        <KitText role="body" tone="muted" part="label">
          {emptyLine(thing)}
        </KitText>
      </KitCard>
    );
  }
  return (
    <KitCard style="inset" part="root">
      {pairs.map((pair, index) =>
        style === "grid" && index % 2 ? null : (
          <PairRow key={pair.id} pair={pair} next={style === "grid" ? pairs[index + 1] : undefined} />
        ),
      )}
    </KitCard>
  );
}
