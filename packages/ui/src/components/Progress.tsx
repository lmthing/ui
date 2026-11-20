import {
  useWords,
  KitCard,
  KitEmpty,
  KitMeter,
  KitRow,
  KitSkeleton,
  useComponentState,
  useVariant,
} from "../kit";
import { z } from "zod";
import {
  probesFor,
  itemVariantProps,
  localeOf,
  numberLine,
  itemsOf,
  placeholderTitle,
  screenId,
  text,
  thingOf,
  titleOf,
  variantProps,
  wordsFor,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";

export const meta = {
  id: "Progress",
  group: "data",
  purpose: "Progress toward several targets at once, each bar with its amount and target.",
  pick: "Several measured amounts, each against its own target, such as macros, a budget per category or lessons per course. Not one main goal (Ring), amounts compared with each other (Bars), or place in a short sequence (Steps).",
  writeHints: [
    "Use JSON null for every unrequested Progress and bar axis, even when another axis is set. Crossing a target by itself does not request a special tone.",
    'Set only figures to "short" if asked to abbreviate counts; keep the original numbers in value and of. Use density "compact" only for requested tighter rows.',
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath:
    "Amounts summed from records in the on-device database, each compared with a target stored there.",
  variants: { density: ["comfortable", "compact"], figures: ["exact", "short"] },
  items: { key: "bars", parts: ["root", "label", "amount"], variants: { tone: ["warn", "good", "bad"] } },
  parts: ["root"],
  states: ["filled", "empty", "loading"],
  actions: { items: { root: ["press"] } },
  read: (input, state, lang?: string): string[] => {
    if (state !== "filled") return [];
    const { bars, figures } = input as z.output<typeof props>;
    return bars.map((bar) => amountLine(bar, figures, lang));
  },
} as const satisfies Meta;

export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    bars: z
      .array(
        z.strictObject({
          label: text(20),
          value: z.number().min(0),
          of: z.number().positive(),
          unit: text(8).optional(),
          ...itemVariantProps(meta.items.variants),
          goto: screenId.optional(),
        }),
      )
      .min(1)
      .max(5),
  })
  // Only linked bars expose a root action to the shared reader.
  .overwrite((value) => ({ ...value, bars: value.bars.map((bar) => ({ ...bar, root: bar.goto })) }));

function amountLine(
  { value, of, unit }: { value: number; of: number; unit?: string | undefined },
  figures: z.output<typeof props>["figures"],
  lang?: string,
) {
  const compact =
    figures === "short" ? new Intl.NumberFormat(localeOf(lang), { notation: "compact" }) : undefined;
  const display = (n: number) => compact?.format(n) ?? numberLine(n, lang);
  return `${display(value)} ${wordsFor(lang).goal(display(of))}${unit ? ` ${unit}` : ""}`;
}

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const bars = itemsOf(cast, 3).flatMap((item) => {
    const label = titleOf(item, 20, thing);
    return label ? [{ label, value: 0, of: 1 }] : [];
  });
  return {
    bars: bars.length
      ? bars
      : [0, 1].map((index) => ({ label: placeholderTitle(index, lang), value: 0, of: 1 })),
  };
}

const walkMeters = [
  { label: "Walks booked", value: 11, of: 12, unit: "walks" },
  { label: "Hours walked", value: 18, of: 20, unit: "h", goto: "hours" },
  { label: "Miles", value: 38, of: 40, unit: "mi" },
];
const steps = { label: "Steps walked", value: 4200, of: 6000, unit: "steps" };
const bookings = { label: "Walks booked", value: 14, of: 12, unit: "walks" };
const treats = { label: "Extra treats", value: 7, of: 5, unit: "treats" };

export const examples = [
  {
    bars: [
      { label: "Watered this week", value: 3, of: 5, unit: "plants" },
      { label: "Fed this month", value: 1, of: 4, unit: "plants" },
    ],
  },
  { density: "compact", bars: walkMeters },
  { bars: walkMeters },
  { bars: [steps] },
  { figures: "short", bars: [steps] },
  { bars: [bookings] },
  { bars: [{ ...bookings, tone: "good" }] },
  { bars: [treats] },
  { bars: [{ ...treats, tone: "bad" }] },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("Progress");
export const probes = [
  choose("Show how far along I am with protein, carbs and fats against my daily limits, all together"),
  choose(
    "Show how close I am to my one goal of watering all five plants today, as a single big ring",
    "Ring",
  ),
  write("Two bars: plants watered this week 3 of 5, and plants fed this month 1 of 4"),
  {
    ...write(
      "Two target bars: Steps walked 4,200 out of 6,000 and Distance 1,500 out of 2,000 metres. Store the exact values, but abbreviate the displayed numbers as 4.2K, 6K, 1.5K and 2K.",
    ),
    variant: { axis: "figures", value: "short" },
  },
  read("Open the hours bar", { address: "p1/r2", action: "press" }, 1),
] satisfies Probe[];

export function Progress(input: Props<typeof props, typeof meta>) {
  const { bars, figures } = input;
  const density = useVariant("density", meta.variants.density, input.density);
  const { lang } = useWords();
  const state = useComponentState();
  if (state === "loading") {
    return (
      <KitCard style="inset" padded density={density}>
        <KitSkeleton rows={bars.length} lead="none" density={density} />
      </KitCard>
    );
  }
  if (state === "empty") {
    return (
      <KitCard style="inset" padded density={density}>
        <KitEmpty part="title" />
      </KitCard>
    );
  }
  return (
    <KitCard style="inset" part="root" padded density={density}>
      {bars.map((bar) => (
        <KitRow key={bar.id} item={bar.id} label={bar.label} goto={bar.goto} inset="none" density={density}>
          <KitMeter
            label={bar.label}
            amount={amountLine(bar, figures, lang)}
            ratio={bar.value / bar.of}
            tone={bar.value > bar.of ? bar.tone : "accent"}
            slim={density === "compact"}
          />
        </KitRow>
      ))}
    </KitCard>
  );
}
