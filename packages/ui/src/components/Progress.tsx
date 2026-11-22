import { z } from "zod";
// prettier-ignore
import {
  KitCard, KitFigure, KitHeader, KitLayoutText, KitMeter, KitRing, KitRow, KitSkeleton, KitState, useVariant, useWords,
} from "../kit";
// prettier-ignore
import {
  probesFor, goalLine, itemVariantProps, localeOf, numberLine, itemsOf, placeholderTitle,
  screenId, text, thingOf, titleOf, variantProps, wordsFor,
  type FallbackInput, type Meta, type Probe, type Props,
} from "../catalog";
import { prompt } from "../entry/prompt-Progress.generated";
export const meta = {
  id: "Progress",
  status: "ready",
  group: "data",
  ...prompt,
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Amounts summed from records on the device, each compared with a stored target.",
  signatureByStyle: { ring: "ring_fill" },
  // prettier-ignore
  variants: { density: ["comfortable", "compact"], figures: ["exact", "short"], emphasis: ["normal", "hero"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["sub"] } },
  items: {
    key: "bars",
    parts: ["root", "label", "amount"],
    addressedWhen: { style: "bars" },
    variants: { tone: ["warn", "good", "bad"] },
  },
  parts: ["root", "ring", "value", "label", "sub"],
  states: ["filled", "empty", "loading"],
  actions: { items: { root: ["press"] } },
  read: (input, state, lang): string[] => {
    if (state !== "filled") return [];
    const { style, bars, figures, sub, detail } = input as {
      style: "bars" | "ring";
      bars: (Goal & { label: string })[];
      figures: "exact" | "short";
      sub?: string;
      detail: "full" | "brief";
    };
    if (style !== "ring") return bars.map((bar) => amountLine(bar, figures, lang));
    const goal = bars[0];
    return goal
      ? [
          amountLine(goal, "exact", lang),
          JSON.stringify(goal.label),
          ...(sub && detail !== "brief" ? [JSON.stringify(sub)] : []),
        ]
      : [];
  },
} as const satisfies Meta;

export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    style: z.enum(["bars", "ring"]).default("bars"),
    // prettier-ignore
    bars: z.array(z.strictObject({
      label: text(24), value: z.number().min(0), of: z.number().positive(),
      unit: text(8).optional(), ...itemVariantProps(meta.items.variants), goto: screenId.optional(),
    })).min(1).max(5),
    sub: text(48).optional().meta({ read: false }),
  })
  .superRefine((input, ctx) => {
    const { style, bars, sub } = input;
    const issue = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: "custom", path, message });
    if (style === "ring") {
      if (bars.length !== 1) issue(["bars"], "A ring needs exactly one goal");
      if (input.figures !== "exact") issue(["figures"], "Only bars can abbreviate figures");
      if (bars.some(({ unit, tone, goto }) => unit || tone !== "warn" || goto))
        issue(["bars", 0], "A ring goal has only label, value and of");
    } else {
      if (sub !== undefined) issue(["sub"], "The caption belongs to a ring");
      for (const [index, { label }] of bars.entries())
        if (label.length > 20) issue(["bars", index, "label"], "A bar label has at most 20 characters");
    }
  })
  .overwrite((value) => ({
    ...value,
    bars: value.style === "ring" ? value.bars : value.bars.map((bar) => ({ ...bar, root: bar.goto })),
  }));

type Goal = { value: number; of: number; unit?: string | undefined };
function amountLine({ value, of, unit }: Goal, figures: "exact" | "short", lang?: string) {
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
    bars: bars.length ? bars : [0, 1].map((i) => ({ label: placeholderTitle(i, lang), value: 0, of: 1 })),
  };
}

const walkMeters = [
  { label: "Walks booked", value: 11, of: 12, unit: "walks" },
  { label: "Hours walked", value: 18, of: 20, unit: "h", goto: "hours" },
  { label: "Miles", value: 38, of: 40, unit: "mi" },
];
const steps = { label: "Steps walked", value: 4200, of: 6000, unit: "steps" };
const bookings = { label: "Walks booked", value: 14, of: 12, unit: "walks" };
const ring = {
  style: "ring" as const,
  bars: [{ label: "Walks this week", value: 9, of: 12 }],
  sub: "3 to go",
};
// prettier-ignore
export const examples = [
  { bars: [{ label: "Watered this week", value: 3, of: 5, unit: "plants" }, { label: "Fed this month", value: 1, of: 4, unit: "plants" }] },
  { density: "compact", bars: walkMeters },
  { bars: walkMeters },
  { bars: [steps] },
  { figures: "short", bars: [steps] },
  { bars: [bookings] },
  { bars: [{ ...bookings, label: "Minimum bookings", tone: "good" }] },
  { bars: [{ label: "Daily treat limit", value: 7, of: 5, unit: "treats", tone: "bad" }] },
  ring,
  { ...ring, emphasis: "hero" },
  { ...ring, detail: "brief" },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("Progress");
// prettier-ignore
export const probes = [
  choose("Show how far along I am with protein, carbs and fats against my daily limits, all together"),
  choose("Show three of the five plants I planned to water today as one amount completed out of the target"),
  choose("Show how close I am to watering all five plants today as a single big circular meter"),
  choose("Show my total plants, the number watered today and the number due together", "Stats"),
  choose("I'm at stage two of a four-stage sign-up and need to see my place in the sequence", "Steps"),
  write("Two bars: plants watered this week 3 of 5, and plants fed this month 1 of 4"),
  { ...write("Show a single horizontal target bar labelled Watered today, 3 out of 5."),
    expectProps: { style: "bars", bars: [{ label: "Watered today", value: 3, of: 5 }] } },
  { ...write("Draw one circular meter. Label it Walks booked and show 4 out of 7. Store Morning route as the extra caption but hide it on screen."),
    variant: { axis: "detail", value: "brief" },
    expectProps: { style: "ring", bars: [{ label: "Walks booked", value: 4, of: 7 }], sub: "Morning route" } },
  { ...write("Two target bars: Steps walked 4,200 out of 6,000 and Distance 1,500 out of 2,000 metres. Store the exact values, but abbreviate the displayed numbers as 4.2K, 6K, 1.5K and 2K."),
    variant: { axis: "figures", value: "short" } },
  read("Open the hours bar", { address: "p1/r2", action: "press" }, 1),
] satisfies Probe[];

type ViewProps = Props<typeof props, typeof meta>;

// prettier-ignore
function ProgressRing({ bars, emphasis, density, detail, sub }: ViewProps) {
  const goal = bars[0]!;
  const scale = emphasis === "hero" ? "lg" : "md";
  const { lang } = useWords();
  const caption = <KitHeader align="center" density={density}
    title={{ text: goal.label, part: "label", role: "body" }}
    meta={{ text: detail === "brief" ? undefined : sub, part: "sub" }} />;
  const loading = <KitFigure caption={caption}
    media={<KitSkeleton shape="ring" ring={scale} lead="none" inset="none" density={density} />} />;
  return (
    <KitState density={density} loading={loading}>
      <KitFigure caption={caption} media={
        <KitRing value={goal.value} of={goal.of} scale={scale} part="ring">
          <KitLayoutText line={{ text: numberLine(goal.value, lang), part: "value", role: "figure" }} align="center" density={density} />
          <KitLayoutText line={{ text: goalLine(goal.of, lang), role: "caption", tone: "muted" }} align="center" density={density} />
        </KitRing>
      } />
    </KitState>
  );
}

// prettier-ignore
export function Progress(input: ViewProps) {
  const { bars, figures, style } = input;
  const density = useVariant("density", meta.variants.density, input.density);
  const { lang } = useWords();
  return (
    <KitCard style="inset" part="root" padded density={density}>
      {style === "ring" ? <ProgressRing {...input} density={density} /> : (
        <KitState density={density} loading={<KitSkeleton rows={bars.length} lead="none" inset="none" density={density} />}>
          {bars.map((bar) => (
            <KitRow key={bar.id} item={bar.id} label={bar.label} goto={bar.goto} inset="none" density={density}>
              <KitMeter label={bar.label} amount={amountLine(bar, figures, lang)} ratio={bar.value / bar.of}
                tone={bar.value > bar.of ? bar.tone : "accent"} slim={density === "compact"} />
            </KitRow>
          ))}
        </KitState>
      )}
    </KitCard>
  );
}
