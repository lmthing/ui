import { z } from "zod";
import {
  probesFor,
  changeLine,
  clip,
  currencies,
  moneyLabels,
  moneyLine,
  placeholderTitle,
  screenId,
  text,
  thingOf,
  type CastLike,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";
import { KitCard, KitContent, KitGrid, KitSkeleton, KitText, useComponentState } from "../kit";

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
  read: (input, state) => {
    if (state !== "filled") return [];
    const v = input as z.output<typeof props>;
    return [
      ...(v.style === "total" && !v.label ? [moneyLabels.total] : []),
      moneyLine(v.value, v.currency, v.per),
      ...(v.was === undefined ? [] : [moneyLine(v.was, v.currency)]),
      ...(v.change === undefined ? [] : [changeLine(v.change, v.changeIn, v.currency)]),
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

export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  return { style: "inline", label: clip(thingOf(cast)?.type.trim() || placeholderTitle(0), 24), value: 0 };
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

export function Amount({
  style,
  label,
  value,
  currency,
  per,
  was,
  change,
  changeIn,
  sub,
  goto,
}: Props<typeof props, typeof meta>) {
  const state = useComponentState();
  if (state === "loading") {
    return (
      <KitCard style="inset" padded>
        <KitSkeleton shape="headline" rows={1} lead="none" />
      </KitCard>
    );
  }
  const large = style === "large";
  const shown = style === "total" ? (label ?? moneyLabels.total) : label;
  const side = large ? "center" : "end";
  const figure = (
    <>
      <KitText role="number" numberScale={large ? "display" : "compact"} align={side} tabular part="value">
        {moneyLine(value, currency, per)}
      </KitText>
      {was !== undefined && (
        <KitText role="caption" tone="muted" strike align={side} tabular part="was">
          {moneyLine(was, currency)}
        </KitText>
      )}
      {change !== undefined && (
        <KitText
          role="caption"
          tone={change > 0 ? "good" : change < 0 ? "bad" : "muted"}
          align={side}
          tabular
          part="change"
        >
          {changeLine(change, changeIn, currency)}
        </KitText>
      )}
      {sub && (
        <KitText role="caption" tone="muted" align={side} part="sub">
          {sub}
        </KitText>
      )}
    </>
  );
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
      label={shown ?? moneyLine(value, currency, per)}
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
