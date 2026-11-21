import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { ancestorDestination, storageCount, storageReading } from "../copy";
import { inventoryWordsFor } from "../lang";

// Core first: List with style "cards" cannot distinguish an ancestor path, child spots and contents here.
export const meta = {
  id: "Storage",
  status: "ready",
  group: "content",
  purpose: "Find things stored inside rooms, shelves and boxes.",
  pick: "Browse nested physical storage with a breadcrumb, child locations and contents kept here. Not flat linked names (List), geographic pins (MapPins), or stock records (Things).",
  writeHints: [
    'Path is ancestor labels in outer-to-inner order. Ancestor screen ids must match their labels in lowercase snake_case (Potting bench → potting_bench). Prefix numeric or reserved ids with "spot_".',
    'Spots are child locations; here lists what is kept in the current location. Never write counts. To hide counts use detail "brief", density null and surface null. For the default view leave all three axes null.',
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "A tree of storage spots and their contents lives on the device.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["count"] } },
  parts: ["root", "path", "spots", "here", "empty"],
  items: { key: "navigation", parts: ["root", "name", "icon", "count"] },
  states: ["filled", "empty"],
  actions: { items: { root: ["press"] }, when: { root: { linked: true } } },
  deviceData: ["storage_spots"],
  previewDeviceData: () => previewDeviceData,
  read: (input, state, lang, data): string[] =>
    state === "filled" ? storageReading(input as z.output<typeof props>, lang, data) : [],
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
      ...value.path.map<Navigation>((name) => {
        const goto = ancestorDestination(name);
        return { name, goto, ancestor: true, linked: goto !== undefined };
      }),
      ...value.spots.map<Navigation>((spot) => ({ ...spot, ancestor: false, linked: true })),
    ],
  }));

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const here = c.itemsOf(cast, 6).flatMap((row) => c.titleOf(row, 28, thing) ?? []);
  return { path: [], spots: [], here: here.length ? here : [c.placeholderTitle(0, lang)] };
}

const previewDeviceData: c.DeviceData = {
  storage_spots: [
    { goto: "seeds", here: ["Basil seeds", "Sweet pea seeds", "Dill seeds"] },
    { goto: "trays", here: ["Seed tray"] },
    { goto: "dry_gear", here: ["Towels", "Spare lead"] },
    { goto: "boot_bin", here: [] },
  ],
};
export const examples = [
  {
    path: ["Greenhouse", "Potting bench"],
    spots: [
      { name: "Seed drawer", icon: "package", goto: "seeds" },
      { name: "Tray rack", icon: "package", goto: "trays" },
    ],
    here: ["Clay pots", "Plant labels"],
  },
  {
    path: ["Van"],
    spots: [
      { name: "Dry gear crate", icon: "package", goto: "dry_gear" },
      { name: "Boot bin", icon: "package", goto: "boot_bin" },
    ],
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
  {
    ...write(
      "At the Potting bench, show the Seed drawer opening the seeds screen and the plant labels stored right here. Hide only the child counts. Leave spacing and the card frame unchanged.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Open the child storage spot named Seed drawer. Do not go back up the breadcrumb.", {
    address: "s1/r3",
    action: "press",
  }),
] satisfies c.Probe[];

type Navigation =
  | { name: string; goto: string | undefined; ancestor: true; linked: boolean }
  | { name: string; goto: string; icon: c.IconName; ancestor: false; linked: true };
type StorageProps = c.Props<typeof props, typeof meta>;
type Density = c.ThemeDensity;

function Breadcrumbs({ rows, density }: { rows: (Navigation & { id: string })[]; density: Density }) {
  const { words } = kit.useWords(inventoryWordsFor);
  return (
    <kit.KitTrack part="path" label={words.storage.path}>
      {rows.map(({ id, name, goto }, index) => (
        <kit.KitRow
          key={id}
          item={id}
          label={name}
          goto={goto}
          density={density}
          inset="none"
          lineRole="caption"
          leading={
            <kit.KitIcon
              name={index === 0 ? "package" : "chevron_right"}
              scale="md"
              tone="muted"
              decorative
            />
          }
        >
          <kit.KitText
            part="name"
            role="caption"
            density={density}
            tone={index === rows.length - 1 ? "accent" : "muted"}
            emphasis={index === rows.length - 1 ? "strong" : "normal"}
          >
            {name}
          </kit.KitText>
        </kit.KitRow>
      ))}
    </kit.KitTrack>
  );
}

// prettier-ignore
export function Storage(input: StorageProps) {
  const { here } = input;
  const state = kit.useComponentState();
  const { lang, words: { storage: words } } = kit.useWords(inventoryWordsFor);
  const data = kit.useDeviceData();
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const rows = c.visibleItems<Navigation & { id: string }>(meta, input);
  const path = rows.filter((row) => row.ancestor);
  const spots = rows.filter((row) => !row.ancestor);
  return <kit.KitCard part="root" padded {...{ density, surface }}>
    {state === "empty" ? <kit.KitEmpty part="empty" icon="package" decorativeIcon /> :
      !rows.length && !here.length ? <kit.KitEmpty part="empty" icon="package" decorativeIcon title={words.emptyHere} /> : <>
        {path.length > 0 && <Breadcrumbs rows={path} density={density} />}
        {spots.length > 0 && <kit.KitContent density={density}>
          <kit.KitText part="spots" role="heading" density="comfortable">{words.spots}</kit.KitText>
          {spots.map(({ id, name, icon, goto }) => {
            const count = detail === "full" ? storageCount(data, goto, lang) : undefined;
            return <kit.KitRow key={id} item={id} label={name} goto={goto} inset="none" density={density}
              leading={<kit.KitIcon part="icon" name={icon} tone="muted" scale="md" />}
              trailing={count && <kit.KitText part="count" role="caption" density={density} tone="muted">
                <kit.KitText part={null} role="number" numberScale="compact" density={density} tabular>{count.digits}</kit.KitText>{count.unit}
              </kit.KitText>}>
              <kit.KitText part="name" density={density}>{name}</kit.KitText>
            </kit.KitRow>;
          })}
        </kit.KitContent>}
        <kit.KitContent density={density}>
          <kit.KitText part="here" role={spots.length ? "caption" : "heading"} tone={spots.length ? "muted" : "text"} density={density}>{words.here}</kit.KitText>
          {(here.length ? here : [words.emptyHere]).map((name, index) =>
            <kit.KitText key={index} part={null} tone={here.length ? "text" : "muted"} density={density}>{name}</kit.KitText>,
          )}
        </kit.KitContent>
      </>}
  </kit.KitCard>;
}
