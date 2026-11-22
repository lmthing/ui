import { z } from "zod";
import {
  probesFor,
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
import { KitChip, KitRow, KitTrack, useVariant } from "../kit";
import { prompt } from "../entry/prompt-Segmented.generated";

export const meta = {
  id: "Segmented",
  group: "input",
  purpose: prompt.purpose,
  pick: prompt.pick,
  region: "top",
  weight: 1,
  tier: "phone",
  realPath: "A local selection changes which view of the screen's data is shown.",
  variants: { surface: ["plain", "outlined"] },
  writeHints: prompt.writeHints,
  items: { key: "options", parts: ["root", "label"] },
  select: { prop: "at", value: "index" },
  parts: ["root"],
  states: ["filled"],
  actions: { items: { root: ["select"] } },
} as const satisfies Meta;

export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    options: z
      .array(z.strictObject({ label: text(14) }))
      .min(2)
      .max(4),
    at: z.int().min(0).default(0),
  })
  .refine(({ options, at }) => at < options.length, {
    path: ["at"],
    message: "Must index an available option",
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
  { options: [{ label: "Today" }, { label: "Week" }], surface: "outlined" },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("Segmented");
export const probes = [
  choose("Switch this care schedule between today, this week and all dates, showing one view at a time"),
  choose("Filter my plants by room, letting me keep kitchen and bathroom selected together", "Chips"),
  write("Switch the care schedule between Today, Week and All, starting with Today"),
  {
    ...write("Switch the care schedule between Today and Week. Put one border around the whole switcher."),
    variant: { axis: "surface", value: "outlined" },
  },
  read("Show the week", { address: "s1/r2", action: "select" }),
] satisfies Probe[];

export function Segmented({ options, at, surface }: Props<typeof props, typeof meta>) {
  const look = useVariant("surface", meta.variants.surface, surface);
  const track = (
    <KitTrack look="segments">
      {options.map((option, index) => (
        <KitChip
          key={option.id}
          item={option.id}
          label={option.label}
          look="segment"
          role="tab"
          on={index === at}
        />
      ))}
    </KitTrack>
  );
  return look === "plain" ? (
    track
  ) : (
    <KitRow label={options[at]!.label} surface={look}>
      {track}
    </KitRow>
  );
}
