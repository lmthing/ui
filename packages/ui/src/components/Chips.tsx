import { z } from "zod";
import {
  icon,
  itemsOf,
  placeholderTitle,
  text,
  thingOf,
  titleOf,
  type CastLike,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";
import { KitChip, KitTrack } from "../kit";

export const meta = {
  id: "Chips",
  group: "input",
  purpose: "Filter things or pick one value from a few short options.",
  pick: "Filter a collection or choose a value. Not switching between views (Segmented) or ticking off jobs (Checklist).",
  region: "body",
  weight: 1,
  tier: "phone",
  realPath: "Filter flags or a selected value stored in the on-device database.",
  items: { key: "items", parts: ["root", "label"] },
  parts: ["root"],
  states: ["filled"],
  actions: {
    items: { root: ["toggle", "select"] },
    when: { "root.toggle": { style: "filter" }, "root.select": { style: "choose" } },
  },
  aliases: ["pills", "filters", "choices"],
} as const satisfies Meta;

export const props = z
  .strictObject({
    style: z.enum(["filter", "choose"]).default("filter"),
    items: z
      .array(
        z.strictObject({
          label: text(16),
          on: z.boolean().default(false),
          icon: icon.optional(),
        }),
      )
      .min(2)
      .max(6),
  })
  .refine((value) => value.style !== "choose" || value.items.filter((item) => item.on).length <= 1, {
    path: ["items"],
    message: "Choose allows at most one selected item",
  });

export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  const thing = thingOf(cast);
  const labels = itemsOf(cast, 6).flatMap((item) => {
    const label = titleOf(item, 16, thing);
    return label ? [label] : [];
  });
  while (labels.length < 2) labels.push(placeholderTitle(labels.length));
  return { style: "filter", items: labels.map((label, index) => ({ label, on: index === 0 })) };
}

export const examples = [
  {
    style: "filter",
    items: [
      { label: "All rooms", on: true },
      { label: "Bathroom" },
      { label: "Kitchen" },
      { label: "Living room" },
    ],
  },
  {
    style: "choose",
    items: [{ label: "30 min", on: true, icon: "clock" }, { label: "45 min" }, { label: "60 min" }],
  },
] satisfies z.input<typeof props>[];

export const probes = [
  { kind: "choose", need: "Show plants in only the rooms I pick", expect: "Chips" },
  {
    kind: "choose",
    need: "Switch between the upcoming walks view and the completed walks view",
    expect: "Segmented",
  },
  {
    kind: "write",
    brief: "Let me choose a walk length: 30 min selected, 45 min or 60 min",
    expect: "Chips",
  },
  {
    kind: "read",
    screen: 0,
    task: "Show only kitchen plants",
    expect: { address: "c1/r3", action: "toggle" },
  },
] satisfies Probe[];

export function Chips({ style, items }: Props<typeof props, typeof meta>) {
  return (
    <KitTrack look="pills">
      {items.map((item) => (
        <KitChip
          key={item.id}
          item={item.id}
          label={item.label}
          on={item.on}
          icon={item.icon}
          look="pill"
          role={style === "filter" ? "checkbox" : "radio"}
        />
      ))}
    </KitTrack>
  );
}
