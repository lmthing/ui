import { z } from "zod";
import * as c from "../catalog";
import { amountChangeLabel, amountRateLabel } from "../catalog/lang/en/Amount";
import * as kit from "../kit";
import { prompt } from "../entry/prompt-Amount.generated";

export const meta = {
  id: "Amount",
  group: "data",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "A sum computed on the device from stored records. No money moves.",
  variants: {
    emphasis: ["normal", "hero"],
    detail: ["full", "brief"],
  },
  variantParts: { "detail.brief": { hides: ["sub"] } },
  parts: ["root", "label", "value", "rate", "was", "change", "sub"],
  states: ["filled", "loading"],
  actions: { parts: { root: ["press"] }, when: { root: { linked: true } } },
  read: (input, state, lang?: string): string[] => {
    if (state !== "filled") return [];
    const v = input as AmountData;
    const { shown, sum, was, change } = amountCopy(v, lang);
    return [!v.label ? shown : undefined, sum, was, change].filter((s) => s !== undefined);
  },
} as const satisfies c.Meta;

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    style: z.enum(["inline", "total"]).optional(),
    label: c.text(24).optional(),
    value: z.number(),
    currency: z.enum(c.currencies).default("USD"),
    per: z.enum(["none", "hour", "day", "night", "week", "month", "year", "each", "person"]).default("none"),
    was: z.number().optional(),
    change: z.number().optional(),
    changeIn: z.enum(["money", "percent"]).default("money"),
    sub: c.text(40).optional(),
    goto: c.screenId.optional(),
  })
  .overwrite((value) => ({
    ...value,
    ...(value.detail === "brief" ? { sub: undefined } : {}),
    linked: value.goto !== undefined,
  }));

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  return { label: c.clip(c.thingOf(cast)?.type.trim() || c.placeholderTitle(0, lang), 24), value: 0 };
}

export const examples = [
  { emphasis: "hero", label: "Spent on plants", value: 42.5, change: -6.5, sub: "this month" },
  { label: "Morning walk", value: 18, per: "each", was: 20, goto: "walks" },
  { label: "Spent on plants", value: 42.5, change: -6.5, sub: "this month" },
  { label: "Morning walk", value: 18, per: "each", was: 20, goto: "walks" },
  { style: "total", value: 54, currency: "GBP" },
  { style: "total", value: 54, currency: "GBP" },
  { label: "Weekly walks", value: 72, sub: "Four walks" },
  { label: "Weekly walks", value: 72, detail: "brief", sub: "Four walks" },
  {
    label: "April operating balance",
    value: -9824567.45,
    currency: "EUR",
    change: -112345.76,
    sub: "After payroll",
    emphasis: "hero",
  },
  {
    label: "Bookings revenue",
    value: 4850,
    currency: "GBP",
    change: 12.4,
    changeIn: "percent",
    sub: "Compared with March",
  },
  { label: "Refund reserve", value: 0, currency: "GBP", change: 0, sub: "Since last close" },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Amount");
export const probes = [
  choose("Show how much I owe my flatmates this month as one big figure, with what changed since last month"),
  choose("Show my income, what I spent and what is left this month as three numbers side by side", "Stats"),
  write("My savings are 1240.50 euros, down 32 euros this week, shown as one large figure labelled Savings"),
  {
    ...write("Show £72 labelled Weekly walks. Store the note Four morning walks but hide it on screen."),
    variant: { axis: "detail", value: "brief" },
  },
  read("Open the walks price", { address: "a1", action: "press" }, 1),
] satisfies c.Probe[];

type AmountData = z.output<typeof props>;
type AmountProps = c.Props<typeof props, typeof meta>;

function changeCopy(
  change: number,
  kind: AmountData["changeIn"],
  currency: AmountData["currency"],
  lang?: string,
) {
  if (change === 0) return amountChangeLabel.flat;
  const magnitude = Math.abs(change);
  const shown =
    kind === "percent" ? c.percentageLine(magnitude, lang) : c.moneyLine(magnitude, currency, "none", lang);
  return amountChangeLabel[change > 0 ? "up" : "down"](shown);
}

function amountCopy(
  { style, label, value, currency, per, was, change, changeIn }: AmountData,
  lang?: string,
) {
  const { moneyLabels, perAmount, perWords } = c.wordsFor(lang);
  const price = c.moneyLine(value, currency, undefined, lang);
  const sum = per === "none" ? price : perAmount(price, perWords[per]);
  return {
    shown: label ?? (style === "total" ? moneyLabels.total : undefined),
    price,
    sum,
    // Other dictionaries own the ordering of their full rate expression.
    rate: per !== "none" && c.localeOf(lang) === c.defaultLang ? amountRateLabel(perWords[per]) : undefined,
    was: was === undefined ? undefined : c.moneyLine(was, currency, undefined, lang),
    change: change === undefined ? undefined : changeCopy(change, changeIn, currency, lang),
  };
}

function AmountLoading(input: AmountProps & { density: "comfortable" | "compact" }) {
  const { lang } = kit.useWords();
  const { shown, price, sum, rate, was, change } = amountCopy(input, lang);
  const { density, sub } = input;
  const large = input.emphasis === "hero",
    centered = large && !input.style;
  return (
    <kit.KitCard style="inset" padded density={density}>
      <kit.KitSkeleton
        shape="figure"
        inset="none"
        centered={centered}
        split={!centered && Boolean(shown)}
        density={density}
        content={[
          [large ? "label" : "body", shown],
          [large ? "number" : "body", rate ? price : sum, "end"],
          ["caption", rate, "end"],
          ["caption", was, "end"],
          ["caption", change, "end"],
          ["caption", sub, "end"],
        ]}
      />
    </kit.KitCard>
  );
}

function AmountFigure({ input, copy }: { input: AmountProps; copy: ReturnType<typeof amountCopy> }) {
  const { emphasis, sub } = input;
  const density = kit.useKit().density;
  const large = emphasis === "hero",
    align = large && !input.style ? "center" : "end";
  return (
    <>
      <kit.KitText
        role="number"
        numberScale={large ? "display" : "compact"}
        {...{ align, density }}
        tabular
        breakLongWords
        part="value"
      >
        {copy.rate ? copy.price : copy.sum}
      </kit.KitText>
      {copy.rate && (
        <kit.KitText role="caption" tone="muted" {...{ align, density }} part="rate">
          {copy.rate}
        </kit.KitText>
      )}
      {copy.was !== undefined && (
        <kit.KitText
          role="caption"
          tone="muted"
          strike
          {...{ align, density }}
          tabular
          breakLongWords
          part="was"
        >
          {copy.was}
        </kit.KitText>
      )}
      {copy.change !== undefined && (
        <kit.KitText role="caption" tone="muted" {...{ align, density }} tabular breakLongWords part="change">
          {copy.change}
        </kit.KitText>
      )}
      {sub && (
        <kit.KitText role="caption" tone="muted" {...{ align, density }} part="sub">
          {sub}
        </kit.KitText>
      )}
    </>
  );
}

// Entry loads or cuts to an exact reading. The kit rolls the number on confirmed changes;
// the unit, label and link stay put, and no component exit or focus move is
// scheduled. A replacement value wins immediately; reduced motion shows the same final reading.
export function Amount(input: AmountProps) {
  const { lang } = kit.useWords();
  const state = kit.useComponentState();
  const density = kit.useKit().density;
  const emphasis = kit.useVariant("emphasis", meta.variants.emphasis, input.emphasis);
  if (state === "loading") return <AmountLoading {...input} {...{ density, emphasis }} />;
  const copy = amountCopy(input, lang),
    { shown } = copy,
    { goto } = input;
  const centered = emphasis === "hero" && !input.style;
  const figure = <AmountFigure input={{ ...input, emphasis }} copy={copy} />;
  const name = shown && (
    <kit.KitText
      role={centered ? "label" : "body"}
      tone={centered ? "muted" : "text"}
      align={centered ? "center" : "start"}
      part="label"
      breakLongWords
      {...{ density }}
    >
      {shown}
    </kit.KitText>
  );
  const label =
    goto && name ? (
      <kit.KitGrid fitLast density={density}>
        {name}
        <kit.KitIcon name="chevron_right" scale="sm" decorative />
      </kit.KitGrid>
    ) : (
      name
    );
  return (
    <kit.KitCard style="inset" part="root" padded {...{ density, goto }} label={shown ?? copy.sum}>
      {centered || !shown ? (
        <kit.KitContent {...{ density }}>
          {label}
          {figure}
        </kit.KitContent>
      ) : (
        <kit.KitContent inset="md" {...{ density }}>
          <kit.KitGrid columns={2} {...{ density }}>
            {label}
            <kit.KitContent {...{ density }}>{figure}</kit.KitContent>
          </kit.KitGrid>
        </kit.KitContent>
      )}
    </kit.KitCard>
  );
}
