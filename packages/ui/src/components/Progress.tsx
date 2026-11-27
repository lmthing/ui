import { z } from "zod";
import {
  KitCard,
  KitContent,
  KitFigure,
  KitHeader,
  KitIcon,
  KitLayoutText,
  KitMeter,
  KitRing,
  KitRow,
  KitSkeleton,
  KitState,
  KitText,
  PartScope,
  useComponentState,
  useKit,
  usePartContext,
  useWords,
} from "../kit";
import {
  probesFor,
  appointmentDate,
  goalLine,
  isoDate,
  itemVariantProps,
  localeOf,
  numberLine,
  screenId,
  text,
  variantProps,
  wordsFor,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";
import { progressLoadFailed, progressOverTarget, progressViewDetails } from "../catalog/lang/en/Progress";
import { prompt } from "../entry/prompt-Progress.generated";
export const meta = {
  id: "Progress",
  status: "ready",
  group: "data",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Amounts summed from records on the device, each compared with a stored target.",
  signatureByStyle: { ring: "ring_fill" },
  // prettier-ignore
  variants: { figures: ["exact", "short"], emphasis: ["normal", "hero"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["sub"] } },
  items: {
    key: "bars",
    parts: ["root", "label", "amount", "deadline"],
    addressedWhen: { style: "bars" },
    variants: { tone: ["warn", "good", "bad"] },
  },
  parts: ["root", "ring", "value", "label", "sub", "deadline", "status", "over_target"],
  states: ["filled", "empty", "loading", "error"],
  actions: { items: { root: ["press"] } },
  readError: true,
  readInState: (_input, state) => state === "empty",
  read: (input, state, lang): string[] => {
    const { style, bars, figures, sub, detail } = input as {
      style: "bars" | "ring";
      bars: (Goal & { id?: string; label: string; goto?: string })[];
      figures: "exact" | "short";
      sub?: string;
      detail: "full" | "brief";
    };
    if (state === "error") return [progressLoadFailed, ...bars.map(({ label }) => JSON.stringify(label))];
    if (state === "empty") return [wordsFor(lang).progressUnavailable];
    if (state !== "filled") return [];
    if (!bars.length) return [wordsFor(lang).progressUnavailable];
    if (style !== "ring")
      return bars.flatMap((bar, index) => [
        ...goalReading(bar, figures, lang),
        ...(bar.goto ? [`${bar.id ?? `r${index + 1}`} ${progressViewDetails}`] : []),
      ]);
    const goal = bars[0];
    return goal
      ? [
          ...goalReading(goal, "exact", lang),
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
      unit: text(16).optional(), due: isoDate.optional().meta({ read: false }),
      ...itemVariantProps(meta.items.variants), goto: screenId.optional(),
    })).min(0).max(5),
    sub: text(48).optional().meta({ read: false }),
  })
  .superRefine((input, ctx) => {
    const { style, bars, sub } = input;
    const issue = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: "custom", path, message });
    for (const [index, { due, unit }] of bars.entries())
      if (due && !unit) issue(["bars", index, "unit"], "A dated goal needs a unit");
    if (style === "ring") {
      if (bars.length > 1) issue(["bars"], "A ring can show only one goal");
      if (input.figures !== "exact") issue(["figures"], "Only bars can abbreviate figures");
      if (bars.some(({ tone, goto }) => tone !== "warn" || goto))
        issue(["bars", 0], "Only bars support custom tone and goto");
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

type Goal = { value: number; of: number; unit?: string | undefined; due?: string | undefined };
function amountLine({ value, of, unit }: Goal, figures: "exact" | "short", lang?: string) {
  const compact =
    figures === "short" ? new Intl.NumberFormat(localeOf(lang), { notation: "compact" }) : undefined;
  const display = (n: number) => compact?.format(n) ?? numberLine(n, lang);
  return `${display(value)} ${wordsFor(lang).goal(display(of))}${unit ? ` ${unit}` : ""}`;
}

function decimalParts(value: number) {
  const [digits, exponent = "0"] = value.toString().split("e");
  const [whole, fraction = ""] = digits!.split(".");
  return { coefficient: BigInt(`${whole}${fraction}`), exponent: Number(exponent) - fraction.length };
}

/** Subtract the authored decimal quantities, rather than their binary approximations. */
function remainingAmount(value: number, total: number) {
  if (value >= total) return 0;
  const used = decimalParts(value);
  const target = decimalParts(total);
  const exponent = Math.min(used.exponent, target.exponent);
  const atScale = (part: typeof used) => part.coefficient * 10n ** BigInt(part.exponent - exponent);
  return Number(`${atScale(target) - atScale(used)}e${exponent}`);
}

function deadlineLine({ due, unit, value, of }: Goal, lang?: string) {
  if (!due || !unit) return undefined;
  const words = wordsFor(lang);
  const remaining = numberLine(remainingAmount(value, of), lang);
  return `${words.progressDue(appointmentDate(due, lang))} · ${words.progressRemaining(remaining, unit)}`;
}

function exceededLine({ value, of, unit }: Goal, lang?: string) {
  if (value <= of) return undefined;
  const amount = numberLine(remainingAmount(of, value), lang);
  return progressOverTarget(unit ? `${amount} ${unit}` : amount);
}

function goalReading(goal: Goal, figures: "exact" | "short", lang?: string) {
  const deadline = deadlineLine(goal, lang);
  const exceeded = exceededLine(goal, lang);
  return [
    amountLine(goal, figures, lang),
    ...(figures === "short" ? [amountLine(goal, "exact", lang)] : []),
    ...(exceeded ? [exceeded] : []),
    ...(deadline ? [deadline] : []),
  ];
}

export function fallback(_input: FallbackInput): z.input<typeof props> {
  return { bars: [] };
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
export const examples = [
  {
    bars: [
      { label: "Watered this week", value: 3, of: 5, unit: "plants" },
      { label: "Fed this month", value: 1, of: 4, unit: "plants" },
    ],
  },
  { bars: walkMeters },
  { bars: walkMeters },
  { bars: [steps] },
  { figures: "short", bars: [steps] },
  { bars: [bookings] },
  { bars: [{ ...bookings, label: "Minimum bookings", tone: "good" }] },
  { bars: [{ label: "Daily treat limit", value: 7, of: 5, unit: "treats", tone: "bad" }] },
  ring,
  { ...ring, emphasis: "hero" },
  { ...ring, detail: "brief" },
  { bars: [{ label: "Blocks sewn", value: 8, of: 12, unit: "blocks", due: "2026-12-05" }] },
  { style: "ring", bars: [{ label: "Blocks sewn", value: 8, of: 12, unit: "blocks", due: "2026-12-05" }] },
  { style: "ring", bars: [{ label: "Meals packed", value: 0, of: 24, unit: "meals" }] },
  { style: "ring", bars: [] },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("Progress");
export const probes = [
  choose("Show how far along I am with protein, carbs and fats against my daily limits, all together"),
  choose("Show three of the five plants I planned to water today as one amount completed out of the target"),
  choose("Show how close I am to watering all five plants today as a single big circular meter"),
  choose("Show my total plants, the number watered today and the number due together", "Stats"),
  choose("I'm at stage two of a four-stage sign-up and need to see my place in the sequence", "Steps"),
  write("Two bars: plants watered this week 3 of 5, and plants fed this month 1 of 4"),
  {
    ...write("Show a single horizontal target bar labelled Watered today, 3 out of 5."),
    expectProps: { style: "bars", bars: [{ label: "Watered today", value: 3, of: 5 }] },
  },
  {
    ...write(
      "Draw one circular meter. Label it Walks booked and show 4 out of 7. Store Morning route as the extra caption but hide it on screen.",
    ),
    variant: { axis: "detail", value: "brief" },
    expectProps: { style: "ring", bars: [{ label: "Walks booked", value: 4, of: 7 }], sub: "Morning route" },
  },
  {
    ...write(
      "Two target bars: Steps walked 4,200 out of 6,000 and Distance 1,500 out of 2,000 metres. Store the exact values, but abbreviate the displayed numbers as 4.2K, 6K, 1.5K and 2K.",
    ),
    variant: { axis: "figures", value: "short" },
  },
  read("Open the hours bar", { address: "p1/r2", action: "press" }, 1),
] satisfies Probe[];

type ViewProps = Props<typeof props, typeof meta>;

function ProgressDeadline({ goal, align }: { goal: Goal; align: "start" | "center" }) {
  const { lang } = useWords();
  const line = deadlineLine(goal, lang);
  return line ? (
    <KitText role="caption" tone="muted" part="deadline" align={align}>
      {line}
    </KitText>
  ) : null;
}

function ProgressRing({ bars, emphasis, detail, sub }: ViewProps) {
  const density = useKit().density;
  const goal = bars[0]!;
  const scale = emphasis === "hero" ? "lg" : "md";
  const { lang, words } = useWords();
  const caption = (
    <KitHeader
      align="center"
      density={density}
      title={{ text: goal.label, part: "label", role: "body" }}
      meta={{ text: detail === "brief" ? undefined : sub, part: "sub" }}
    />
  );
  const loading = (
    <KitFigure
      caption={
        <KitText role="body" tone="muted" align="center" part={null}>
          {goal.label} · {words.loadingLabel}
        </KitText>
      }
      media={<KitSkeleton shape="ring" ring={scale} lead="none" inset="none" density={density} />}
    />
  );
  return (
    <KitState density={density} loading={loading}>
      <KitFigure
        caption={caption}
        media={
          <GoalRing goal={goal} scale={scale}>
            <KitLayoutText
              line={{ text: numberLine(goal.value, lang), part: "value", role: "figure" }}
              align="center"
              density={density}
            />
            <KitLayoutText
              line={{
                text: goal.unit ? `${goalLine(goal.of, lang)} ${goal.unit}` : goalLine(goal.of, lang),
                role: "caption",
                tone: "muted",
              }}
              align="center"
              density={density}
            />
          </GoalRing>
        }
      />
      <ProgressExceeded goal={goal} align="center" />
      <ProgressDeadline goal={goal} align="center" />
    </KitState>
  );
}

function ProgressExceeded({ goal, align }: { goal: Goal; align: "start" | "center" }) {
  const { lang } = useWords();
  const line = exceededLine(goal, lang);
  return line ? (
    <KitText role="caption" tone="muted" part={align === "center" ? "over_target" : null} align={align}>
      {line}
    </KitText>
  ) : null;
}

function GoalRing({ goal, scale, children }: { goal: Goal; scale: "md" | "lg"; children: React.ReactNode }) {
  const { signature, ...scope } = usePartContext();
  const { environment } = useKit();
  const cue = goal.value > 0 && Boolean(scope.cue || environment.cue);
  return (
    <PartScope {...scope} {...(cue && signature ? { signature } : {})}>
      <KitRing value={goal.value} of={goal.of} scale={scale} part="ring">
        {children}
      </KitRing>
    </PartScope>
  );
}

function ProgressStatus({ bars }: Pick<ViewProps, "bars">) {
  const { words } = useWords();
  const scope = usePartContext();
  const failed = scope.state === "error";
  return (
    <PartScope {...scope} state={failed ? "error" : "empty"}>
      <KitState
        part="status"
        retain={failed && bars.length > 0}
        message={failed ? progressLoadFailed : words.progressUnavailable}
        {...(!failed ? { icon: "bar_chart" as const } : {})}
      >
        {failed &&
          bars.map(({ id, label }) => (
            <KitText key={id} part={null}>
              {label}
            </KitText>
          ))}
      </KitState>
    </PartScope>
  );
}

// Keep the confirmed value and goal anchored; only the ring's arc animates for a positive cue.
// Bars update inside their tracks. Empty, unavailable and exit cut, without a new focus target.
// Subsequent updates supersede the prior cue; reduced motion uses the same exact values.
export function Progress(input: ViewProps) {
  const { bars, figures, style } = input;
  const density = useKit().density;
  const { lang } = useWords();
  const state = useComponentState();
  const unavailable = state === "empty" || (state === "filled" && !bars.length);
  return (
    <KitCard style="inset" part="root" padded density={density}>
      {state === "error" || unavailable ? (
        <ProgressStatus bars={bars} />
      ) : !bars.length ? (
        <KitState density={density} />
      ) : style === "ring" ? (
        <ProgressRing {...input} />
      ) : (
        <KitState
          density={density}
          loading={<KitSkeleton rows={bars.length} lead="none" inset="none" density={density} />}
        >
          {bars.map((bar) => (
            <KitRow
              key={bar.id}
              item={bar.id}
              label={bar.label}
              goto={bar.goto}
              inset="none"
              density={density}
            >
              <KitContent>
                <KitMeter
                  label={bar.label}
                  amount={amountLine(bar, figures, lang)}
                  ratio={bar.value / bar.of}
                  tone={bar.value > bar.of ? bar.tone : "accent"}
                  slim={density === "compact"}
                />
                <ProgressExceeded goal={bar} align="start" />
                <ProgressDeadline goal={bar} align="start" />
                {bar.goto && <ProgressDetails />}
              </KitContent>
            </KitRow>
          ))}
        </KitState>
      )}
    </KitCard>
  );
}

function ProgressDetails() {
  return (
    <KitContent lead={<KitIcon name="chevron_right" scale="sm" decorative />} lineRole="body">
      <KitText role="body" tone="muted" part={null}>
        {progressViewDetails}
      </KitText>
    </KitContent>
  );
}
