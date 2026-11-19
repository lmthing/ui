import { useWords, KitCard, KitContent, KitGrid, KitSkeleton, KitText, useComponentState } from "../kit";
import {
  wordsFor,
  probesFor,
  changeLine,
  clip,
  currencies,
  moneyLine,
  placeholderTitle,
  screenId,
  text,
  thingOf,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";
import { z } from "zod";

export const meta = {
  id: "Amount",
  group: "data",
  purpose: "One sum of money written properly, with its period, old price or change.",
  pick: "One sum of money is the point: a balance, a price, a total or what is owed. Not several figures side by side (Stats), the screen's headline in words (Hero), or the price on each row of a list (List).",
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "A sum computed on the device from stored records. No money moves.",
  parts: ["root", "label", "value", "was", "change", "sub"],
  states: ["filled", "loading"],
  actions: { parts: { root: ["press"] }, when: { root: { linked: true } } },
  read: (input, state, lang?: string) => {
    const { moneyLabels } = wordsFor(lang);

    if (state !== "filled") return [];
    const v = input as z.output<typeof props>;
    return [
      ...(v.style === "total" && !v.label ? [moneyLabels.total] : []),
      moneyLine(v.value, v.currency, v.per, lang),
      ...(v.was === undefined ? [] : [moneyLine(v.was, v.currency, undefined, lang)]),
      ...(v.change === undefined ? [] : [changeLine(v.change, v.changeIn, v.currency, lang)]),
    ];
  },
} as const satisfies Meta;

export const props = z
  .strictObject({
    style: z.enum(["inline", "large", "total"]).default("inline"),
    label: text(24).optional(),
    value: z.number(),
    currency: z.enum(currencies).default("USD"),
    per: z.enum(["none", "hour", "day", "night", "week", "month", "year", "each", "person"]).default("none"),
    was: z.number().optional(),
    change: z.number().optional(),
    changeIn: z.enum(["money", "percent"]).default("money"),
    sub: text(40).optional(),
    goto: screenId.optional(),
  })
  // Derived, never written: only a linked amount can be pressed.
  .overwrite((value) => ({ ...value, linked: value.goto !== undefined }));

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  return {
    style: "inline",
    label: clip(thingOf(cast)?.type.trim() || placeholderTitle(0, lang), 24),
    value: 0,
  };
}

export const examples = [
  { style: "large", label: "Spent on plants", value: 42.5, change: -6.5, sub: "this month" },
  { style: "inline", label: "Morning walk", value: 18, per: "each", was: 20, goto: "walks" },
  { style: "total", value: 54, currency: "GBP" },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("Amount");
export const probes = [
  choose("Show how much I owe my flatmates this month as one big figure, with what changed since last month"),
  choose("Show my income, what I spent and what is left this month as three numbers side by side", "Stats"),
  write("My savings are 1240.50 euros, down 32 euros this week, shown as one large figure labelled Savings"),
  read("Open the walks price", { address: "a1", action: "press" }, 1),
] satisfies Probe[];

function AmountFigure({
  style,
  value,
  currency,
  per,
  was,
  change,
  changeIn,
  sub,
}: Props<typeof props, typeof meta>) {
  const { lang } = useWords();
  const large = style === "large";
  return (
    <>
      <KitText
        role="number"
        numberScale={large ? "display" : "compact"}
        align={large ? "center" : "end"}
        tabular
        part="value"
      >
        {moneyLine(value, currency, per, lang)}
      </KitText>
      {was !== undefined && (
        <KitText role="caption" tone="muted" strike align={large ? "center" : "end"} tabular part="was">
          {moneyLine(was, currency, undefined, lang)}
        </KitText>
      )}
      {change !== undefined && (
        <KitText
          role="caption"
          tone={change > 0 ? "good" : change < 0 ? "bad" : "muted"}
          align={large ? "center" : "end"}
          tabular
          part="change"
        >
          {changeLine(change, changeIn, currency, lang)}
        </KitText>
      )}
      {sub && (
        <KitText role="caption" tone="muted" align={large ? "center" : "end"} part="sub">
          {sub}
        </KitText>
      )}
    </>
  );
}

function AmountLoading(input: Props<typeof props, typeof meta>) {
  const { lang, words } = useWords();
  const { moneyLabels } = words;
  const { style, label, value, currency, per, was, change, changeIn } = input;
  const shown = style === "total" ? (label ?? moneyLabels.total) : label;
  return (
    <KitCard style="inset" padded look={style === "total" ? "outlined" : "surface"}>
      <KitSkeleton
        shape="figure"
        inset="none"
        centered={style === "large"}
        split={style !== "large" && Boolean(shown)}
        content={[
          [style === "large" ? "label" : "body", shown],
          [style === "large" ? "number" : "body", moneyLine(value, currency, per, lang), "end"],
          ["caption", was === undefined ? undefined : moneyLine(was, currency, undefined, lang), "end"],
          ["caption", change === undefined ? undefined : changeLine(change, changeIn, currency, lang), "end"],
          ["caption", input.sub, "end"],
        ]}
      />
    </KitCard>
  );
}

export function Amount(input: Props<typeof props, typeof meta>) {
  const { lang, words } = useWords();
  const { moneyLabels } = words;
  const { style, label, value, currency, per, goto } = input;
  const state = useComponentState();
  if (state === "loading") return <AmountLoading {...input} />;
  const large = style === "large";
  const shown = style === "total" ? (label ?? moneyLabels.total) : label;
  const figure = <AmountFigure {...input} />;
  const name = shown && (
    <KitText
      role={large ? "label" : "body"}
      tone={large ? "muted" : "text"}
      align={large ? "center" : "start"}
      part="label"
    >
      {shown}
    </KitText>
  );
  return (
    <KitCard
      style="inset"
      look={style === "total" ? "outlined" : "surface"}
      part="root"
      padded
      goto={goto}
      label={shown ?? moneyLine(value, currency, per, lang)}
    >
      {large || !shown ? (
        <KitContent>
          {name}
          {figure}
        </KitContent>
      ) : (
        <KitGrid columns={2}>
          {name}
          <KitContent>{figure}</KitContent>
        </KitGrid>
      )}
    </KitCard>
  );
}
