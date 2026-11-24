import { z } from "zod";
import {
  dataViewFilter,
  dataViewOption,
  probesFor,
  itemsOf,
  placeholderTitle,
  text,
  thingOf,
  titleOf,
  validDataView,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";
import { KitChip, KitTrack } from "../kit";
import { prompt } from "../entry/prompt-Segmented.generated";

export const meta = {
  id: "Segmented",
  status: "ready",
  group: "input",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "top",
  weight: 1,
  tier: "phone",
  realPath: "A local selection changes which view of the screen's data is shown.",
  items: { key: "options", parts: ["root", "label"] },
  select: { prop: "at", value: "index" },
  parts: ["root", "results"],
  dataView: "options",
  states: ["filled"],
  actions: { items: { root: ["select"] } },
} as const satisfies Meta;

export const props = z
  .strictObject({
    options: z
      .array(z.strictObject({ label: text(14), view: dataViewOption.optional() }))
      .min(2)
      .max(4),
    at: z.int().min(0).default(0),
    filter: dataViewFilter.optional(),
  })
  .refine(({ options, at }) => at < options.length, {
    path: ["at"],
    message: "Must index an available option",
  })
  .refine(({ options, filter }) => validDataView(options, filter), {
    path: ["options"],
    message: "Bind every option to the same kind of data view",
  });

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const options = itemsOf(cast, 2).flatMap((item) => {
    const label = titleOf(item, 14, thing);
    return label ? [{ label }] : [];
  });
  while (options.length < 2) options.push({ label: placeholderTitle(options.length, lang) });
  return { options, at: 0 };
}

export const examples = [
  { options: [{ label: "Today" }, { label: "Week" }, { label: "All" }], at: 0 },
  { options: [{ label: "Upcoming" }, { label: "Past" }], at: 1 },
  { options: [{ label: "Today" }, { label: "Week" }] },
  {
    options: [
      { label: "Strength class" },
      { label: "Endurance work" },
      { label: "Mobility class" },
      { label: "Recovery class" },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("Segmented");
export const probes = [
  choose("Switch this care schedule between today, this week and all dates, showing one view at a time"),
  choose("Filter my plants by room, letting me keep kitchen and bathroom selected together", "Chips"),
  write("Switch the care schedule between Today, Week and All, starting with Today"),
  read("Show the week", { address: "s1/r2", action: "select" }),
] satisfies Probe[];

export function Segmented({ options, at }: Props<typeof props, typeof meta>) {
  return (
    <KitTrack look="segments" keyboard>
      {options.map((option, index) => (
        <KitChip
          key={option.id}
          item={option.id}
          label={option.label}
          look="segment"
          role="tab"
          on={index === at}
          roving
        />
      ))}
    </KitTrack>
  );
}
