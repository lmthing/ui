import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { bulkReading, bulkSelected } from "../copy";
import { dataWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-BulkActions.generated";

// Core first: Actions/default offers shortcuts, not commands tied to a checked set of records.
export const meta = {
  id: "BulkActions",
  status: "ready",
  group: "action",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "bottom",
  weight: 2,
  tier: "phone",
  realPath: "The action applied to the selected records on the device.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"], arrange: ["grid", "rows"] },
  selectionBinding: { component: "Table", check: "pick", all: "all", requireSelection: true },
  parts: ["root", "count", "all", "all_label"],
  items: { key: "items", parts: ["root", "label", "icon", "confirm"] },
  states: ["filled", "empty"],
  // Confirmation metadata addresses static part names, so dangerous rows use their confirm part.
  confirmParts: ["confirm"],
  actions: {
    parts: { all: ["press"] },
    items: { root: ["press"], confirm: ["press"] },
    when: { root: { danger: false }, confirm: { danger: true } },
  },
  read: (input, state, lang): string[] =>
    state === "filled" ? bulkReading((input as LiveProps).$selection, lang) : [],
} as const satisfies c.Meta;

export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  items: z
    .array(z.strictObject({ icon: c.icon, label: c.text(14), danger: z.boolean() }))
    .min(2)
    .max(4),
});

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const items = c.itemsOf(cast, 2, thing?.type);
  return {
    items: [0, 1].map((index) => ({
      icon: "check",
      label: (items[index] && c.titleOf(items[index], 14, thing)) ?? c.placeholderTitle(index, lang),
      danger: false,
    })),
  };
}

export const examples = [
  {
    items: [
      { icon: "check", label: "Mark watered", danger: false },
      { icon: "close", label: "Delete plants", danger: true },
    ],
  },
  {
    density: "comfortable",
    arrange: "grid",
    surface: "card",
    items: [
      { icon: "check", label: "Mark reviewed", danger: false },
      { icon: "share", label: "Export walks", danger: false },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("BulkActions");
export const probes = [
  choose(
    "After I tick several record rows, show the selected count, select all, and let me apply one archive, tag or delete command to the marked rows.",
  ),
  choose(
    "Give me three independent shortcuts for calling, sharing and finding directions. They do not act on selected records.",
    "Actions",
  ),
  write(
    "For checked plant records, offer Mark watered with a check icon and Delete plants with a close icon. Only deleting is dangerous.",
  ),
  {
    ...write(
      "For checked plant records, put Mark watered (check icon) and Delete plants (close icon) one above the other, one command per row. Only Delete plants is destructive.",
    ),
    variant: { axis: "arrange", value: "rows" },
  },
  read("Start deleting the checked plants, which asks for confirmation.", {
    address: "s1/r2/confirm",
    action: "press",
  }),
] satisfies c.Probe[];

type ViewProps = c.Props<typeof props, typeof meta>;
type LiveProps = ViewProps & { $selection?: c.BoundSelection | undefined };

function BulkCommand({
  item: { id, label, icon, danger },
  density,
}: {
  item: ViewProps["items"][number];
  density: c.ThemeDensity;
}) {
  const context = kit.usePartContext();
  const tone = danger ? "bad" : "accent";
  const button = (
    <kit.KitRow
      part={danger ? "confirm" : "root"}
      role="button"
      label={label}
      lineRole="label"
      density={density}
      leading={<kit.KitIcon name={icon} tone={tone} part="icon" />}
    >
      <kit.KitText role="label" part="label" tone={tone} density={density}>
        {label}
      </kit.KitText>
    </kit.KitRow>
  );
  return (
    <kit.PartScope {...context} item={id}>
      {danger ? <kit.KitCard style="plain">{button}</kit.KitCard> : button}
    </kit.PartScope>
  );
}

export function BulkActions(input: ViewProps) {
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const arrange = kit.useVariant("arrange", meta.variants.arrange, input.arrange);
  const state = kit.useComponentState();
  const { words, lang } = kit.useWords(dataWordsFor);
  const { $selection: selection } = kit.useLiveControls(meta, input) as LiveProps;
  if (state !== "filled" || !selection?.selected.length) return null;
  const count = bulkSelected(selection.selected.length, lang);
  return (
    <kit.KitCard padded density={density} surface={input.surface}>
      <kit.KitRow
        inset="none"
        label={count}
        trailing={
          selection.canSelectAll && (
            <kit.KitAction part="all" action="press" kind="quiet" label={words.bulkSelectAll} />
          )
        }
      >
        <kit.KitText part="count" role="number" numberScale="compact" density={density}>
          {count}
        </kit.KitText>
      </kit.KitRow>
      <kit.KitGrid list listRowGap="cards" {...{ arrange, density }}>
        {input.items.map((item) => (
          <BulkCommand key={item.id} {...{ item, density }} />
        ))}
      </kit.KitGrid>
    </kit.KitCard>
  );
}
