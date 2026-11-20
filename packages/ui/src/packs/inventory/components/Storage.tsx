import { z } from "zod";
import * as c from "../../../catalog";

// Core first: List/cards cannot put ancestor breadcrumbs and contents alongside child storage spots.
export const meta = {
  id: "Storage",
  status: "draft",
  group: "content",
  purpose: "Find things stored inside rooms, shelves and boxes.",
  pick: "Browse nested physical storage with a breadcrumb, child locations and contents kept here. Not flat linked names (List), geographic pins (MapPins), or stock records (Things).",
  writeHints: [
    "Path is ancestor labels in outer-to-inner order. Spots are child locations; here is what is kept in the current location. Do not write counts.",
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "A tree of storage spots and their contents lives on the device.",
  variants: { density: ["comfortable", "compact"] },
  parts: ["root", "path", "spots", "here"],
  items: { key: "navigation", parts: ["root", "name", "icon", "count"] },
  states: ["filled", "empty"],
  actions: { items: { root: ["press"] } },
  read: (input): string[] => {
    const { path, spots, here } = input as z.output<typeof props>;
    return [
      ...path.map((name, index) => `r${index + 1} ${JSON.stringify(name)}`),
      ...spots.map(({ name }, index) => `r${path.length + index + 1} ${JSON.stringify(name)}`),
      ...here.map((name) => JSON.stringify(name)),
    ];
  },
} as const satisfies c.Meta;

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    path: z.array(c.text(16)).min(0).max(4),
    spots: z
      .array(z.strictObject({ name: c.text(24), icon: c.icon, goto: c.screenId }))
      .min(0)
      .max(6),
    here: z.array(c.text(28)).min(0).max(6),
  })
  // The catalog addresses one repeating collection. Keep both source groups on the wire.
  .overwrite((value) => ({
    ...value,
    navigation: [
      ...value.path.map((name) => ({ name, kind: "ancestor" })),
      ...value.spots.map((spot) => ({ ...spot, kind: "spot" })),
    ],
  }));

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const here = c.itemsOf(cast, 6).flatMap((row) => c.titleOf(row, 28, thing) ?? []);
  return { path: [], spots: [], here: here.length ? here : [c.placeholderTitle(0, lang)] };
}

export const examples = [
  {
    path: ["Greenhouse", "Potting bench"],
    spots: [{ name: "Seed drawer", icon: "square", goto: "seeds" }],
    here: ["Clay pots", "Plant labels"],
  },
  {
    density: "compact",
    path: ["Van"],
    spots: [{ name: "Dry gear crate", icon: "square", goto: "dry_gear" }],
    here: [],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Storage");
export const probes = [
  choose(
    "Browse my garage as rooms, shelves and boxes inside each other, with a breadcrumb and what is kept at the current spot",
  ),
  choose(
    "Show a flat, tappable set of names with a link per name. There are no folders, sublocations or ancestors.",
    "List",
  ),
  write(
    "Browse Greenhouse, then Potting bench. Inside is a Seed drawer with square icon opening seeds. Clay pots and Plant labels are kept here.",
  ),
  read("Open the child storage spot named Seed drawer. Do not go back up the breadcrumb.", {
    address: "s1/r3",
    action: "press",
  }),
] satisfies c.Probe[];
