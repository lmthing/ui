import { z } from "zod";
import {
  probesFor,
  clip,
  icon,
  placeholderTitle,
  screenId,
  text,
  thingOf,
  variantProps,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";
import { KitCard, KitGrid, KitIcon, KitRow, KitText, KitTile } from "../kit";
import { prompt } from "../entry/prompt-Actions.generated";

export const meta = {
  id: "Actions",
  group: "action",
  ...prompt,
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Each shortcut opens a linked screen on the phone.",
  variants: { arrange: ["grid", "rows"], surface: ["card", "plain", "outlined"] },
  items: { key: "items", parts: ["root", "icon", "label"] },
  states: ["filled"],
  actions: { items: { root: ["press"] } },
} as const satisfies Meta;

export const props = z.strictObject({
  ...variantProps(meta.variants),
  items: z
    .array(z.strictObject({ icon, label: text(16), goto: screenId }))
    .min(2)
    .max(4),
});

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  return {
    items: [0, 1].map((index) => {
      const thing = thingOf({ ...cast, things: cast.things.slice(index) });
      const type = thing?.type.trim();
      const readable = type?.replace(/[_-]+/g, " ").trim();
      const label = readable
        ? clip(readable.charAt(0).toUpperCase() + readable.slice(1), 16)
        : placeholderTitle(index, lang);
      return {
        icon: icon.safeParse(type).data ?? "dot",
        label,
        goto:
          screenId.safeParse(type).data ?? placeholderTitle(index, lang).toLowerCase().replace(/\s+/g, "_"),
      };
    }),
  };
}

export const examples = [
  {
    items: [
      { icon: "drop", label: "Water", goto: "water" },
      { icon: "plus", label: "Add plant", goto: "add_plant" },
      { icon: "calendar", label: "Schedule", goto: "schedule" },
    ],
  },
  {
    items: [
      { icon: "dog", label: "Book walk", goto: "book_walk" },
      { icon: "users", label: "Clients", goto: "clients" },
      { icon: "wallet", label: "Earnings", goto: "earnings" },
      { icon: "message", label: "Messages", goto: "messages" },
    ],
  },
  {
    items: [
      { icon: "leaf", label: "My plants", goto: "plants" },
      { icon: "calendar", label: "Water history", goto: "watering_history" },
    ],
  },
  {
    arrange: "rows",
    items: [
      { icon: "dog", label: "Book walk", goto: "book_walk" },
      { icon: "users", label: "Clients", goto: "clients" },
      { icon: "wallet", label: "Earnings", goto: "earnings" },
      { icon: "message", label: "Messages", goto: "messages" },
    ],
  },
  {
    surface: "plain",
    items: [
      { icon: "leaf", label: "My plants", goto: "plants" },
      { icon: "drop", label: "Water", goto: "water" },
    ],
  },
  {
    surface: "outlined",
    items: [
      { icon: "leaf", label: "My plants", goto: "plants" },
      { icon: "drop", label: "Water", goto: "water" },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("Actions");
export const probes = [
  choose("Give me three ways to log watering, add a plant and see the schedule"),
  choose("Let me log watering with one main tap", "Button"),
  write("Let me book a dog walk, open my clients, see earnings and read messages"),
  {
    ...write(
      "Stack the Book walk, Clients, Earnings and Messages shortcuts vertically, one per row, each opening its own screen.",
    ),
    variant: { axis: "arrange", value: "rows" },
  },
  read("Add a plant", { address: "a1/r2", action: "press" }),
] satisfies Probe[];

export function Actions({ items, arrange, surface }: Props<typeof props, typeof meta>) {
  return (
    <KitCard part="root" surface={surface}>
      <KitGrid arrange={arrange} columns={items.length === 3 ? 3 : 2}>
        {items.map(({ id, icon, label, goto }) =>
          arrange === "rows" ? (
            <KitRow
              key={id}
              item={id}
              label={label}
              goto={goto}
              leading={<KitIcon name={icon} tone="accent" part="icon" />}
              trailing={<KitIcon name="chevron_right" decorative />}
            >
              <KitText role="label" part="label">
                {label}
              </KitText>
            </KitRow>
          ) : (
            <KitTile key={id} item={id} icon={icon} label={label} goto={goto} />
          ),
        )}
      </KitGrid>
    </KitCard>
  );
}
