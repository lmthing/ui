import { z } from "zod";
import * as c from "../catalog";
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
    density: ["comfortable", "compact"],
    emphasis: ["normal", "hero"],
    surface: ["card", "outlined"],
    detail: ["full", "brief"],
  },
  variantParts: { "detail.brief": { hides: ["sub"] } },
  parts: ["root", "label", "value", "was", "change", "sub"],
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
  { label: "Morning walk", value: 18, per: "each", was: 20, goto: "walks", density: "compact" },
  { label: "Spent on plants", value: 42.5, change: -6.5, sub: "this month" },
  { label: "Morning walk", value: 18, per: "each", was: 20, goto: "walks" },
  { style: "total", surface: "card", value: 54, currency: "GBP" },
  { style: "total", surface: "outlined", value: 54, currency: "GBP" },
  { label: "Weekly walks", value: 72, sub: "Four walks" },
  { label: "Weekly walks", value: 72, detail: "brief", sub: "Four walks" },
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

function amountCopy(
  { style, label, value, currency, per, was, change, changeIn }: AmountData,
  lang?: string,
) {
  const { moneyLabels, perAmount, perWords } = c.wordsFor(lang);
  const price = c.moneyLine(value, currency, undefined, lang);
  return {
    shown: label ?? (style === "total" ? moneyLabels.total : undefined),
    price,
    sum: per === "none" ? price : perAmount(price, perWords[per]),
    was: was === undefined ? undefined : c.moneyLine(was, currency, undefined, lang),
    change: change === undefined ? undefined : c.changeLine(change, changeIn, currency, lang),
  };
}

function AmountLoading(input: AmountProps & { density: "comfortable" | "compact" }) {
  const { lang } = kit.useWords();
  const { shown, sum, was, change } = amountCopy(input, lang);
  const { density, surface, sub } = input;
  const large = input.emphasis === "hero",
    centered = large && !input.style;
  return (
    <kit.KitCard style="inset" padded {...{ density, surface }}>
      <kit.KitSkeleton
        shape="figure"
        inset="none"
        centered={centered}
        split={!centered && Boolean(shown)}
        density={density}
        content={[
          [large ? "label" : "body", shown],
          [large ? "number" : "body", sum, "end"],
          ["caption", was, "end"],
          ["caption", change, "end"],
          ["caption", sub, "end"],
        ]}
      />
    </kit.KitCard>
  );
}

// prettier-ignore
function AmountFigure({ input, copy }: { input: AmountProps; copy: ReturnType<typeof amountCopy> }) {
  const { emphasis, density, sub } = input;
  const large = emphasis === "hero", align = large && !input.style ? "center" : "end";
  const delta = input.change ?? 0;
  const rateAt = density === "compact" && input.per !== "none" ? copy.sum.indexOf(copy.price) : -1;
  const rate = (word: string) => word && <kit.KitText role="caption" tone="muted" part={null}>{word}</kit.KitText>;
  return <>
    <kit.KitText role="number" numberScale={large ? "display" : "compact"} {...{ align, density }} tabular part="value">
      {rateAt < 0 ? copy.sum : <>
        {rate(copy.sum.slice(0, rateAt))}{copy.price}{rate(copy.sum.slice(rateAt + copy.price.length))}
      </>}
    </kit.KitText>
    {copy.was !== undefined && <kit.KitText role="caption" tone="muted" strike {...{ align, density }} tabular part="was">
      {copy.was}
    </kit.KitText>}
    {copy.change !== undefined && <kit.KitText role="caption" tone={delta > 0 ? "good" : delta < 0 ? "bad" : "muted"}
      {...{ align, density }} tabular part="change">{copy.change}</kit.KitText>}
    {sub && <kit.KitText role="caption" tone="muted" {...{ align, density }} part="sub">{sub}</kit.KitText>}
  </>;
}

// prettier-ignore
export function Amount(input: AmountProps) {
  const { lang } = kit.useWords();
  const state = kit.useComponentState();
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const emphasis = kit.useVariant("emphasis", meta.variants.emphasis, input.emphasis);
  if (state === "loading") return <AmountLoading {...input} {...{ density, emphasis }} />;
  const copy = amountCopy(input, lang), { shown } = copy, { surface, goto } = input;
  const centered = emphasis === "hero" && !input.style;
  const figure = <AmountFigure input={{ ...input, density, emphasis }} copy={copy} />;
  const name = shown && <kit.KitText role={centered ? "label" : "body"} tone={centered ? "muted" : "text"}
    align={centered ? "center" : "start"} part="label" {...{ density }}>{shown}</kit.KitText>;
  return <kit.KitCard style="inset" part="root" padded {...{ density, surface, goto }} label={shown ?? copy.sum}>
    {centered || !shown ? <kit.KitContent {...{ density }}>{name}{figure}</kit.KitContent> :
      <kit.KitGrid columns={2} {...{ density }}>{name}<kit.KitContent {...{ density }}>{figure}</kit.KitContent></kit.KitGrid>}
  </kit.KitCard>;
}
