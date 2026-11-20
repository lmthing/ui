import { z } from "zod";
import {
  probesFor,
  variantProps,
  type DeviceData,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../../../catalog";
import * as kit from "../../../kit";
import { converterDisplay, converterMax, converterReading, projectConverter } from "../copy";
import { tripsWordsFor } from "../lang";

// Core first: Amount/default cannot edit either side of a conversion or swap the currency pair.
export const meta = {
  id: "Converter",
  status: "ready",
  group: "input",
  purpose: "Convert between home and local currencies by entering either amount.",
  pick: "Convert two editable amounts between home and destination currencies with a swap control. Not displaying one sum (Amount) or entering an expense (AmountPad).",
  writeHints: [
    "Use value for the optional starting amount. Do not write currencies, the rate, or a date; the host supplies them.",
    'When asked to hide the rate date with no change to spacing or surface, use "detail":"brief", "density":null, and "surface":null. Do not fill in defaults for any unrequested variant.',
  ],
  region: "body",
  weight: 2,
  tier: "service",
  realPath: "A rates service supplies exchange rates, cached on the device for offline use.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "plain"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["rate_date"] } },
  parts: ["root", "from", "to", "swap", "rate_date"],
  states: ["filled", "loading"],
  actions: { parts: { from: ["type"], to: ["type"], swap: ["press"] } },
  linkedEdits: {
    inputs: {
      from: { prop: "fromText", max: 24 },
      to: { prop: "toText", max: 24 },
    },
    swap: { part: "swap", sides: ["from", "to"] },
    project: projectConverter,
  },
  deviceData: ["exchange_rates"],
  previewDeviceData: ({ input }): DeviceData => ({
    exchange_rates: [previewQuotes[input.value === examples[1]!.value ? 1 : 0]],
  }),
  read: (input, state, lang): string[] => (state === "filled" ? converterReading(input, lang) : []),
} as const satisfies Meta;

export const props = z.strictObject({
  ...variantProps(meta.variants),
  value: z.number().min(0).max(converterMax).optional(),
});

export function fallback(_input: FallbackInput): z.input<typeof props> {
  return {};
}

export const examples = [{ value: 25.5 }, { value: 120 }] satisfies z.input<typeof props>[];

const previewQuotes = [
  { home: "USD", local: "JPY", rate: 149.6, date: "2026-11-19" },
  { home: "GBP", local: "EUR", rate: 1.16, date: "2026-11-20" },
] as const;

const { choose, write, read } = probesFor("Converter");
export const probes = [
  choose(
    "Let me type either the yen or the amount in my home currency, see the other amount update, and swap the two",
  ),
  choose(
    "Display the total hotel charge as one formatted read-only money amount, not a conversion",
    "Amount",
  ),
  write("Convert between the home and destination currencies, starting with an amount of 120."),
  {
    ...write(
      "Start the currency converter at 25. Hide only the line saying when the rate was last updated. Keep the usual spacing and card appearance.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Swap the two currencies", { address: "c1/swap", action: "press" }),
] satisfies Probe[];

type ConverterProps = Props<typeof props, typeof meta>;

function ConverterSwap({
  density,
  label,
  loading,
}: {
  density: (typeof meta.variants.density)[number];
  label: string;
  loading: boolean;
}) {
  return (
    <kit.KitRow
      {...(loading ? {} : { part: "swap", role: "button" as const })}
      {...{ label, density }}
      lineRole="caption"
    >
      {loading ? (
        <kit.KitSkeleton shape="figure" inset="none" content={[["caption", label]]} />
      ) : (
        <kit.KitText part={null} role="caption" tone="accent">
          {label}
        </kit.KitText>
      )}
    </kit.KitRow>
  );
}

export function Converter(input: ConverterProps) {
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const loading = kit.useComponentState() === "loading";
  const { lang, words } = kit.useWords(tripsWordsFor);
  const live = kit.useLiveControls(meta, input);
  const { fields, rateDate } = converterDisplay(live, lang);
  const { converter } = words;
  return (
    <kit.KitCard part="root" padded {...{ density, surface }}>
      {fields.map(({ part, label, text }) => (
        <kit.KitContent
          key={part}
          density={density}
          group={part === "to" && density === "comfortable" ? "response" : "content"}
        >
          <kit.KitContent inset="md">
            {loading ? (
              <kit.KitSkeleton shape="figure" inset="none" content={[["caption", label]]} />
            ) : (
              <kit.KitText part={null} role="caption" tone="muted">
                {label}
              </kit.KitText>
            )}
          </kit.KitContent>
          <kit.KitInput
            {...{ part, label }}
            hint={converter.amountHint}
            value={loading ? "" : text}
            kind="number"
            action="type"
            projected
            inactive={Boolean(live.rate) && part === live.source}
          />
        </kit.KitContent>
      ))}
      <ConverterSwap {...{ density, loading }} label={converter.swap} />
      {rateDate && (
        <kit.KitContent inset="md">
          {loading ? (
            <kit.KitSkeleton shape="figure" inset="none" content={[["caption", rateDate]]} />
          ) : (
            <kit.KitText part="rate_date" role="caption" tone="muted">
              {rateDate}
            </kit.KitText>
          )}
        </kit.KitContent>
      )}
    </kit.KitCard>
  );
}
