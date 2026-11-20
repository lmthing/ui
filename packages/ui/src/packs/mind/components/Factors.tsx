import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";

// Core first: Chips/filter cannot show a dense grid of icon tiles for what shaped the day.
export const meta = {
  id: "Factors",
  status: "ready",
  group: "input",
  purpose: "Mark several things that affected how the day felt.",
  pick: "A grid of four to sixteen independently toggled icon tiles for things that happened or shaped a day. Not a few text filters (Chips), physical symptoms with severity (SymptomLog), or shortcuts (Actions).",
  writeHints: [
    "Give every factor an icon and an explicit on flag. Several factors may be on together.",
    'Use density "compact" only when asked for closer tile spacing. If asked only for tighter spacing, set surface to null, not "card"; otherwise use null for both unless a finish is requested.',
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "Tags are stored with the day's entry on the device.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"] },
  parts: ["root"],
  items: { key: "items", parts: ["root", "icon", "label"] },
  select: { prop: "on", value: "index", mode: "flags" },
  states: ["filled"],
  actions: { items: { root: ["toggle"] } },
} as const satisfies c.Meta;

export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  items: z
    .array(z.strictObject({ label: c.text(14), icon: c.icon, on: z.boolean() }))
    .min(4)
    .max(16),
});

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const items = c.itemsOf(cast, 6);
  return {
    items: Array.from({ length: Math.max(4, items.length) }, (_, index) => {
      const item = items[index];
      const label = item && c.titleOf(item, 14, thing);
      return { label: label ?? c.placeholderTitle(index, lang), icon: "tag", on: false };
    }),
  };
}

export const examples = [
  {
    items: [
      { label: "Slept well", icon: "moon", on: true },
      { label: "Outdoors", icon: "leaf", on: false },
      { label: "Friends", icon: "heart", on: true },
      { label: "Rain", icon: "cloud_rain", on: false },
      { label: "Fresh air", icon: "wind", on: false },
      { label: "Quiet time", icon: "sun", on: true },
      { label: "Late night", icon: "clock", on: false },
      { label: "Music", icon: "music", on: false },
    ],
  },
  {
    surface: "outlined",
    items: [
      { label: "Early start", icon: "sun", on: true },
      { label: "Long shift", icon: "clock", on: true },
      { label: "Music", icon: "music", on: false },
      { label: "Fresh air", icon: "wind", on: false },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Factors");
export const probes = [
  choose(
    "Let me mark several of twelve things that shaped my mood today, using a grid of picture tiles such as sleep, work and outdoors.",
  ),
  choose(
    "Give me a handful of small text filters in one row above my journal: All, Work and Weekend, no icons.",
    "Chips",
  ),
  write(
    "Show four toggles for what shaped today: Slept well and Outdoors are on, Music and Quiet time are off. Give each an icon.",
  ),
  {
    ...write(
      "Keep my journal's factor tile grid compact, with less space between tiles. Give Sleep, Work, Music and Friends an icon each, and mark only Sleep and Friends.",
    ),
    variant: { axis: "density", value: "compact" },
  },
  read("Mark Outdoors as one of the things that shaped the day.", { address: "f1/r2", action: "toggle" }),
] satisfies c.Probe[];

export function Factors(input: c.Props<typeof props, typeof meta>) {
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  return (
    <kit.KitCard part="root" padded {...{ density, surface }}>
      <kit.KitGrid density={density}>
        {input.items.map(({ id, label, icon, on }) => (
          <kit.KitTile
            key={id}
            item={id}
            {...{ label, icon, on, density }}
            action="toggle"
            distinctSelection
          />
        ))}
      </kit.KitGrid>
    </kit.KitCard>
  );
}
