import { z } from "zod";
import {
  probesFor,
  goalLine,
  itemsOf,
  placeholderTitle,
  screenId,
  text,
  thingOf,
  titleOf,
  type CastLike,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";
import { KitCard, KitEmpty, KitMeter, KitRow, KitSkeleton, useComponentState } from "../kit";

export const meta = {
  id: "Progress",
  group: "data",
  purpose: "Progress toward several targets at once, each bar with its amount and target.",
  pick: "Several measured amounts, each against its own target, such as macros, a budget per category or lessons per course. Not one main goal (Ring), amounts compared with each other (Bars), or place in a short sequence (Steps).",
  region: "body",
  weight: 2,
  tier: "phone",
  realPath:
    "Amounts summed from records in the on-device database, each compared with a target stored there.",
  items: { key: "bars", parts: ["root", "label", "amount"] },
  parts: ["root"],
  states: ["filled", "empty", "loading"],
  actions: { items: { root: ["press"] } },
  read: (input, state) => {
    if (state !== "filled") return [];
    const { bars } = input as z.output<typeof props>;
    return bars.map((bar) => amountLine(bar));
  },
} as const satisfies Meta;

export const props = z
  .strictObject({
    style: z.enum(["stack", "compact"]).default("stack"),
    bars: z
      .array(
        z.strictObject({
          label: text(20),
          value: z.number().min(0),
          of: z.number().positive(),
          unit: text(8).optional(),
          over: z.enum(["warn", "good", "bad"]).default("warn"),
          goto: screenId.optional(),
        }),
      )
      .min(1)
      .max(5),
  })
  // Only linked bars expose a root action to the shared reader.
  .overwrite((value) => ({ ...value, bars: value.bars.map((bar) => ({ ...bar, root: bar.goto })) }));

const amountLine = ({ value, of, unit }: { value: number; of: number; unit?: string | undefined }) =>
  `${value} ${goalLine(of)}${unit ? ` ${unit}` : ""}`;

export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  const thing = thingOf(cast);
  const bars = itemsOf(cast, 3).flatMap((item) => {
    const label = titleOf(item, 20, thing);
    return label ? [{ label, value: 0, of: 1 }] : [];
  });
  return {
    style: "stack",
    bars: bars.length ? bars : [0, 1].map((index) => ({ label: placeholderTitle(index), value: 0, of: 1 })),
  };
}

export const examples = [
  {
    style: "stack",
    bars: [
      { label: "Watered this week", value: 3, of: 5, unit: "plants" },
      { label: "Fed this month", value: 1, of: 4, unit: "plants" },
    ],
  },
  {
    style: "compact",
    bars: [
      { label: "Walks booked", value: 14, of: 12, unit: "walks", over: "good" },
      { label: "Hours walked", value: 18, of: 20, unit: "h", goto: "hours" },
      { label: "Miles", value: 42, of: 40, unit: "mi", over: "bad" },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("Progress");
export const probes = [
  choose("Show how far along I am with protein, carbs and fats against my daily limits, all together"),
  choose(
    "Show how close I am to my one goal of watering all five plants today, as a single big ring",
    "Ring",
  ),
  write("Two bars: plants watered this week 3 of 5, and plants fed this month 1 of 4"),
  read("Open the hours bar", { address: "p1/r2", action: "press" }, 1),
] satisfies Probe[];

export function Progress({ style, bars }: Props<typeof props, typeof meta>) {
  const state = useComponentState();
  if (state === "loading") {
    return (
      <KitCard style="inset" padded>
        <KitSkeleton rows={bars.length} lead="none" />
      </KitCard>
    );
  }
  if (state === "empty") {
    return (
      <KitCard style="inset" padded>
        <KitEmpty part="title" />
      </KitCard>
    );
  }
  return (
    <KitCard style="inset" part="root" padded>
      {bars.map((bar) => (
        <KitRow key={bar.id} item={bar.id} label={bar.label} goto={bar.goto} inset="none">
          <KitMeter
            label={bar.label}
            amount={amountLine(bar)}
            ratio={bar.value / bar.of}
            tone={bar.value > bar.of ? bar.over : "accent"}
            slim={style === "compact"}
          />
        </KitRow>
      ))}
    </KitCard>
  );
}
