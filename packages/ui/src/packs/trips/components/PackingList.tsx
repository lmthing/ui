import { z } from "zod";
import {
  detailOf,
  itemsOf,
  placeholderTitle,
  probesFor,
  text,
  thingOf,
  titleOf,
  variantProps,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../../../catalog";
import {
  KitCard,
  KitCheck,
  KitContent,
  KitEmpty,
  KitInput,
  KitMeter,
  KitRow,
  KitText,
  useComponentState,
  useLiveControls,
  useVariant,
  useWords,
} from "../../../kit";
import { packingProgress, packingQuantity, packingRead, packingRows } from "../copy";
import { tripsWordsFor } from "../lang";

const maxItems = 10;
const packedParts = Array.from({ length: maxItems }, (_, i) => `packed_${i + 1}`);
const quantityParts = Array.from({ length: maxItems }, (_, i) => `qty_${i + 1}`);
const packedActions = Object.fromEntries(packedParts.map((part) => [part, ["check"] as const]));
const packedFlags = Object.fromEntries(packedParts.map((part) => [part, `$${part}`]));

// Core first: Checklist/default cannot show grouped packing quantities with an overall packed share.
export const meta = {
  id: "PackingList",
  status: "ready",
  group: "input",
  purpose: "Pack by category or person, track quantities and see what remains.",
  pick: "Items to put in luggage, grouped by category or traveller, with optional quantities and an overall packed share. Not everyday tasks (Checklist) or shopping for groceries (GroceryList).",
  writeHints: [
    "Use 1–6 groups, each with 1–10 items. Write each packed flag; never write the packed share.",
    'For names without visible quantities, set detail to "brief" but keep any supplied quantities in qty. Otherwise leave detail null.',
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "The list lives on the device; sharing across a family needs a shared app.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "plain"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: quantityParts } },
  parts: ["root", "progress", "add"],
  items: { key: "groups", parts: ["root", "label", ...packedParts, ...quantityParts] },
  states: ["filled", "empty", "success"],
  actions: { parts: { add: ["type"] }, items: packedActions },
  emptyActions: ["add.type"],
  successActions: ["add.type"],
  live: { checks: packedFlags },
  read: (input, state, lang): string[] =>
    state === "filled" ? packingRead(input as z.output<typeof props>, lang) : [],
} as const satisfies Meta;

const item = z.strictObject({ name: text(28), qty: z.int().min(1).max(999).optional(), packed: z.boolean() });
const group = z
  .strictObject({
    label: text(16),
    items: z.array(item).min(1).max(maxItems),
  })
  .overwrite((value) => ({
    ...value,
    ...Object.fromEntries(packedParts.map((part, index) => [part, value.items[index]])),
    ...Object.fromEntries(
      value.items.map(({ packed }, index) => [packedFlags[packedParts[index]!]!, packed]),
    ),
  }));

export const props = z.strictObject({
  ...variantProps(meta.variants),
  groups: z.array(group).min(1).max(6),
});

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const items = itemsOf(cast, 3);
  const first = items[0];
  return {
    groups: [
      {
        label: (first && detailOf(first, 16, thing)) ?? placeholderTitle(0, lang),
        items: (items.length ? items : [undefined]).map((item, index) => ({
          name: (item && titleOf(item, 28, thing)) ?? placeholderTitle(index, lang),
          packed: false,
        })),
      },
    ],
  };
}

export const examples = [
  {
    groups: [
      {
        label: "Clothes",
        items: [
          { name: "T-shirts", qty: 3, packed: true },
          { name: "Rain jacket", packed: false },
        ],
      },
      { label: "Tech", items: [{ name: "Travel adapter", qty: 2, packed: false }] },
    ],
  },
  {
    density: "compact",
    surface: "plain",
    groups: [
      {
        label: "Sam",
        items: [
          { name: "Walking boots", packed: true },
          { name: "Spare socks", qty: 4, packed: true },
        ],
      },
      { label: "Jo", items: [{ name: "Warm hat", packed: false }] },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("PackingList");
export const probes = [
  choose("Tick off what goes in our suitcases, grouped by traveller with quantities and a packed percentage"),
  choose("Give me one simple ungrouped list of chores with a tick box for each", "Checklist"),
  write(
    "Make a luggage list: Clothes has three packed T-shirts and an unpacked rain jacket; Tech has two unpacked travel adapters.",
  ),
  {
    ...write(
      "In Clothes, list three packed T-shirts and an unpacked rain jacket. Keep the quantities in the data, but show only item names next to the checkboxes, with no quantities on screen.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Mark the rain jacket packed", { address: "p1/r1/packed_2", action: "check" }),
  read("Type a new item to pack", { address: "p1/add", action: "type" }),
] satisfies Probe[];

type PackingProps = Props<typeof props, typeof meta>;
type PackingGroup = PackingProps["groups"][number];
type PackingFinish = Pick<PackingProps, "detail" | "density">;

// prettier-ignore
function PackingSection({ group, detail, density, lang }: PackingFinish & { group: PackingGroup; lang: string }) {
  const { packing } = tripsWordsFor(lang);
  return <KitRow item={group.id} label={group.label} inline density={density}>
    <KitText role="label" tone="muted" part="label" density={density}>{group.label}</KitText>
    {group.items.map(({ name, qty, packed }, i) => {
      const quantity = detail === "full" && qty !== undefined ? packingQuantity(qty, lang) : undefined;
      const label = quantity ? packing.itemLabel(name, quantity) : name;
      const tone = packed ? "muted" : "text";
      return <KitRow key={packedParts[i]} label={label} inline leadingAlign="row" density={density}
        leading={<KitCheck done={packed} part={packedParts[i]!} label={label} />}
        trailing={quantity && <KitText role="caption" tone="muted" part={quantityParts[i]!} tabular lines={1} density={density}>{quantity}</KitText>}>
        <KitText role="body" tone={tone} part={null} density={density}>{name}</KitText>
      </KitRow>;
    })}
  </KitRow>;
}

// prettier-ignore
export function PackingList(input: PackingProps) {
  const { words: { packing }, lang } = useWords(tripsWordsFor);
  const state = useComponentState();
  const density = useVariant("density", meta.variants.density, input.density);
  const surface = useVariant("surface", meta.variants.surface, input.surface);
  const detail = useVariant("detail", meta.variants.detail, input.detail);
  const live = useLiveControls(meta, input) as PackingProps;
  const groups = packingRows(live.groups);
  const { label, amount, ratio } = packingProgress(groups, lang);
  return <KitCard padded part="root" {...{ density, surface }}>
    {state === "filled" ? <>
      <KitRow part="progress" label={label} inline density={density}>
        <KitMeter {...{ label, amount, ratio }} tone={ratio === 1 ? "good" : "accent"} addressed={false} />
      </KitRow>
      {groups.map((group) => <KitContent key={group.id} group="response" density={density}>
        <PackingSection {...{ group, detail, density, lang }} />
      </KitContent>)}
    </> : <KitEmpty part="progress" decorativeIcon {...(state === "success" ? {
      icon: "check", title: packing.allPacked, tone: "good",
    } : {})} />}
    <KitContent group={state === "filled" ? "response" : "content"} density={density}>
      <KitInput part="add" hint={packing.add} icon="plus" compact={density === "compact"} />
    </KitContent>
  </KitCard>;
}
