import { z } from "zod";
import {
  probesFor,
  icon,
  itemsOf,
  placeholderTitle,
  text,
  thingOf,
  titleOf,
  variantProps,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";
import { KitChip, KitTrack } from "../kit";
import { prompt } from "../entry/prompt-Chips.generated";

export const meta = {
  id: "Chips",
  group: "input",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 1,
  tier: "phone",
  realPath: "Filter flags or a selected value stored in the on-device database.",
  items: { key: "items", parts: ["root", "label", "icon"] },
  select: { prop: "on", value: "index", mode: "flags" },
  parts: ["root"],
  variants: { lead: ["icon", "none"] },
  variantParts: { "lead.none": { hides: ["icon"] } },
  states: ["filled"],
  actions: {
    items: { root: ["toggle", "select"] },
    when: { "root.toggle": { style: "filter" }, "root.select": { style: "choose" } },
  },
} as const satisfies Meta;

export const props = z
  .strictObject({
    ...variantProps(meta.variants),
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

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const labels = itemsOf(cast, 6).flatMap((item) => {
    const label = titleOf(item, 16, thing);
    return label ? [label] : [];
  });
  while (labels.length < 2) labels.push(placeholderTitle(labels.length, lang));
  return { style: "filter", items: labels.map((label, index) => ({ label, on: index === 0 })) };
}

const walkFilters: z.input<typeof props>["items"] = [
  { label: "Park", icon: "dog", on: true },
  { label: "River", icon: "drop" },
];

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
  { items: walkFilters },
  { lead: "none", items: walkFilters },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("Chips");
export const probes = [
  choose(
    "Narrow my plants with Kitchen, Bathroom and Living room in one row. Let me tap the names directly and leave more than one room selected.",
  ),
  choose("Switch between the upcoming walks view and the completed walks view", "Segmented"),
  write("Let me choose a walk length: 30 min selected, 45 min or 60 min"),
  {
    ...write(
      "Keep the two existing filters, Park with dog and River with drop. Give me the text-only version: hide both icons without removing the icon references.",
    ),
    variant: { axis: "lead", value: "none" },
  },
  read("Show only kitchen plants", { address: "c1/r3", action: "toggle" }),
] satisfies Probe[];

export function Chips({ style, items, lead }: Props<typeof props, typeof meta>) {
  return (
    <KitTrack look="pills">
      {items.map((item) => (
        <KitChip
          key={item.id}
          item={item.id}
          label={item.label}
          on={item.on}
          icon={lead === "icon" ? item.icon : undefined}
          look="pill"
          role={style === "filter" ? "checkbox" : "radio"}
        />
      ))}
    </KitTrack>
  );
}
