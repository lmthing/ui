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
import { prompt } from "../../../entry/prompt-Converter.generated";

// Core first: Amount/default cannot edit either side of a conversion or swap the currency pair.
export const meta = {
  id: "Converter",
  status: "ready",
  group: "input",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
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

// prettier-ignore
function ConverterField({ part, label, text, result, loading, density, hint }: {
  part: "from" | "to"; label: string; text: string; result: boolean | undefined; loading: boolean;
  density: NonNullable<ConverterProps["density"]>; hint: string;
}) {
  return (
    <kit.KitContent {...{ density }} group={part === "to" ? "response" : "content"} rhythm="flush">
      <kit.KitContent inset="md" density={density} rhythm="flush">
        {result && text ? (
          <kit.KitFigure density={density} value={{ text, tone: "accent", lines: 1 }}
            unit={{ text: label, lines: 1 }} />
        ) : <kit.KitLayoutText line={{ text: label, role: "caption", tone: "muted" }} density={density} />}
      </kit.KitContent>
      {loading ? (
        <kit.KitRow part={part} label={label} surface="outlined" inline lineRole="body">
          <kit.KitContent inset="md" density={density}>
            <kit.KitLayoutText line={{ text: hint }} density={density} />
          </kit.KitContent>
        </kit.KitRow>
      ) : (
        <kit.KitInput {...{ part, label, hint }} value={text} kind="number" action="type" projected inactive={result === false} />
      )}
    </kit.KitContent>
  );
}

// prettier-ignore
export function Converter(input: ConverterProps) {
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const loading = kit.useComponentState() === "loading";
  const { lang, words } = kit.useWords(tripsWordsFor);
  const live = kit.useLiveControls(meta, input);
  const { fields, rateDate } = converterDisplay(live, lang);
  const { converter } = words;
  const content = <>
      {fields.map((field) => (
        <ConverterField key={field.part} {...field} {...{ loading, density }} hint={converter.amountHint}
          result={live.rate ? field.part !== live.source : undefined} />
      ))}
      <ConverterSwap {...{ density, loading }} label={converter.swap} />
      {rateDate && (
        <kit.KitContent inset="md">
          <kit.KitLayoutText line={{ text: rateDate, part: "rate_date", role: "caption", tone: "muted" }} density={density} />
        </kit.KitContent>
      )}
    </>;
  return (
    <kit.KitCard part="root" padded {...{ density, surface }}>
      <kit.KitState loading={content} density={density}>{content}</kit.KitState>
    </kit.KitCard>
  );
}
