import { z } from "zod";
import {
  clip,
  icon,
  placeholderTitle,
  screenId,
  text,
  thingOf,
  type CastLike,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";
import { KitCard, KitGrid, KitTile } from "../kit";

export const meta = {
  id: "Actions",
  group: "action",
  purpose: "Two to four shortcuts to different things the person can do next.",
  pick: "Two to four quick tasks or destinations together. Not one main action (Button) or several records to scan and open (List).",
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Each shortcut opens a linked screen on the phone.",
  items: { key: "items", parts: ["root", "icon", "label"] },
  states: ["filled"],
  actions: { items: { root: ["press"] } },
  aliases: ["shortcuts", "quickactions", "quicklinks"],
} as const satisfies Meta;

export const props = z.strictObject({
  items: z
    .array(z.strictObject({ icon, label: text(16), goto: screenId }))
    .min(2)
    .max(4),
});

export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  return {
    items: [0, 1].map((index) => {
      const thing = thingOf({ ...cast, things: cast.things.slice(index) });
      const type = thing?.type.trim();
      const readable = type?.replace(/[_-]+/g, " ").trim();
      const label = readable
        ? clip(readable.charAt(0).toUpperCase() + readable.slice(1), 16)
        : placeholderTitle(index);
      return {
        icon: icon.safeParse(type).data ?? "dot",
        label,
        goto: screenId.safeParse(type).data ?? placeholderTitle(index).toLowerCase().replace(/\s+/g, "_"),
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
      { icon: "calendar", label: "Watering history", goto: "watering_history" },
    ],
  },
] satisfies z.input<typeof props>[];

export const probes = [
  {
    kind: "choose",
    need: "Give me three ways to log watering, add a plant and see the schedule",
    expect: "Actions",
  },
  { kind: "choose", need: "Let me log watering with one main tap", expect: "Button" },
  {
    kind: "write",
    brief: "Let me book a dog walk, open my clients, see earnings and read messages",
    expect: "Actions",
  },
  {
    kind: "read",
    screen: 0,
    task: "Add a plant",
    expect: { address: "a1/r2", action: "press" },
  },
] satisfies Probe[];

export function Actions({ items }: Props<typeof props, typeof meta>) {
  return (
    <KitCard padded part="root">
      <KitGrid columns={items.length === 3 ? 3 : 2}>
        {items.map((item) => (
          <KitTile key={item.id} item={item.id} icon={item.icon} label={item.label} goto={item.goto} />
        ))}
      </KitGrid>
    </KitCard>
  );
}
