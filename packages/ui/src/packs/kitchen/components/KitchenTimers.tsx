import { z } from "zod";
import {
  clockLine,
  itemsOf,
  placeholderTitle,
  probesFor,
  text,
  thingOf,
  titleOf,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
  variantProps,
} from "../../../catalog";
import {
  KitAction,
  KitCard,
  KitContent,
  KitEmpty,
  KitGrid,
  KitRing,
  KitRow,
  KitText,
  useComponentState,
  useVariant,
  useWords,
} from "../../../kit";
import {
  countdownOf,
  kitchenTimerControl,
  kitchenTimerMax,
  kitchenTimerMinute,
  kitchenTimerMore,
  kitchenTimerOrder,
  kitchenTimerReading,
} from "../copy";
import { kitchenWordsFor } from "../lang";

// Core first: Timer/down cannot run independently named concurrent countdowns with add-minute controls.
export const meta = {
  id: "KitchenTimers",
  status: "ready",
  group: "action",
  purpose: "Run several named cooking timers at once and adjust each independently.",
  pick: "Two or more named cooking countdowns running independently, each with its own start, pause and add-a-minute controls. Not a single countdown (Timer) or a timed recipe instruction (CookSteps).",
  writeHints: [
    "Write each timer's label and seed seconds, 1–14400. Never write remaining, finished, running, progress or sorted order; the device computes them.",
    'If asked to stack timers one per row instead of side by side, set arrange to "rows"; otherwise leave arrange null.',
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  partTiers: { root: "ok" },
  realPath: "Timers run on the device; alarm notifications need permission.",
  items: {
    key: "timers",
    parts: ["root", "label", "seconds", "more", "tile", "ring"],
    adjust: { "more.press": { prop: "remaining", delta: kitchenTimerMinute } },
    clocks: [
      {
        id: "countdown",
        kind: "down",
        from: "seconds",
        prop: "remaining",
        runningProp: "running",
        max: kitchenTimerMax,
        start: { part: "root", action: "start" },
        stop: { part: "root", action: "stop" },
        zero: { prop: "finished", value: true },
      },
    ],
  },
  parts: ["root", "empty"],
  variants: { arrange: ["grid", "rows"] },
  states: ["filled", "empty"],
  actions: {
    items: { root: ["start", "stop"], more: ["press"] },
    when: { "root.start": { finished: false }, "root.stop": { running: true } },
  },
  read: (input, state, lang?: string): string[] =>
    state === "filled" ? kitchenTimerReading((input as z.output<typeof props>).timers, lang) : [],
} as const satisfies Meta;
export const props = z.strictObject({
  ...variantProps(meta.variants),
  timers: z
    .array(
      z
        .strictObject({
          label: text(16),
          seconds: z.int().min(1).max(kitchenTimerMax),
          remaining: z.int().min(0).max(kitchenTimerMax).optional(),
          finished: z.boolean().default(false),
          running: z.boolean().optional(),
        })
        .refine((timer) => (timer.remaining === undefined) === (timer.running === undefined), {
          message: "Remaining seconds and running state are projected together",
        }),
    )
    .min(1)
    .max(6),
});
export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const timers = itemsOf(cast, 3).map((item, index) => ({
    label: titleOf(item, 16, thing) ?? placeholderTitle(index, lang),
    seconds: kitchenTimerMinute,
  }));
  return {
    timers: timers.length
      ? timers
      : [
          { label: placeholderTitle(0, lang), seconds: kitchenTimerMinute },
          { label: placeholderTitle(1, lang), seconds: kitchenTimerMinute },
        ],
  };
}
// prettier-ignore
const supper = { timers: [{ label: "Béchamel", seconds: 372 }, { label: "Oven", seconds: 1120 }] } satisfies z.input<typeof props>;
// prettier-ignore
const longTimers = { timers: [{ label: "Stock", seconds: 3599 }, { label: "Slow roast", seconds: 14400 }] } satisfies z.input<typeof props>;
// prettier-ignore
export const examples = [supper, { ...supper, arrange: "rows" }, { ...longTimers, arrange: "rows" }, longTimers] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("KitchenTimers");
export const probes = [
  choose("Run separate pasta and oven countdowns at the same time, each with pause and add a minute"),
  choose("Run one six-minute countdown with start and stop, without any other timers", "Timer"),
  write("Two concurrent cooking timers: Béchamel for 372 seconds and Oven for 1120 seconds"),
  {
    ...write(
      "Show two independent timers, Pasta for 420 seconds and Oven for 900 seconds. Stack them one above the other, not side by side.",
    ),
    variant: { axis: "arrange", value: "rows" },
  },
  read("Begin counting down on the timer named Béchamel", { address: "k1/r1", action: "start" }),
  read("Add a minute to the oven timer", { address: "k1/r2/more", action: "press" }),
] satisfies Probe[];

type Timer = Props<typeof props, typeof meta>["timers"][number];
// prettier-ignore
function CountdownTile({ timer, stacked }: { timer: Timer; stacked: boolean }) {
  const {
    lang,
    words: { kitchenTimerLabels: labels },
  } = useWords(kitchenWordsFor);
  const remaining = countdownOf(timer);
  const control = kitchenTimerControl(timer);
  const clock = clockLine(remaining, lang);
  const bigClock = !stacked && remaining < kitchenTimerMinute * kitchenTimerMinute;
  const label = <KitText part="label" role="label" tone="muted" align="center">{timer.label}</KitText>;
  const ring = (
    <KitRing part="ring" value={timer.running ? remaining : 0} of={timer.seconds}>
      <KitText part={null} role={bigClock ? "title" : "number"} numberScale="compact"
        emphasis={bigClock ? "normal" : "hero"} density={stacked ? undefined : "comfortable"}
        tabular align="center" lines={1}>{clock}</KitText>
    </KitRing>
  );
  const actions = <>
    <KitAction part="root" label={labels[control]} action={control === "pause" ? "stop" : "start"}
      kind="secondary" disabled={control === "finished"} full />
    <KitAction part="more" label={kitchenTimerMore(lang)} action="press" kind="quiet"
      disabled={remaining >= kitchenTimerMax} full />
  </>;
  return (
    <KitRow item={timer.id} part="tile" label={timer.label} inset="none">
      {stacked ? (
        <KitContent align="center">
          {label}
          <KitContent density="compact" leadingAlign="row"
            lead={<KitContent>{actions}</KitContent>}>
            <KitRow part="seconds" label={clock} inline>{ring}</KitRow>
          </KitContent>
        </KitContent>
      ) : (
        <KitContent>{label}<KitRow part="seconds" label={clock} inline>{ring}</KitRow>
          <KitContent group="response">{actions}</KitContent></KitContent>
      )}
    </KitRow>
  );
}

export function KitchenTimers(input: Props<typeof props, typeof meta>) {
  const { timers } = input;
  const arrange = useVariant("arrange", meta.variants.arrange, input.arrange);
  const state = useComponentState();
  if (state === "empty")
    return (
      <KitCard part="root" padded>
        <KitEmpty icon="timer" part="empty" decorativeIcon />
      </KitCard>
    );
  const tiles = kitchenTimerOrder(timers).map((timer) => (
    <CountdownTile key={timer.id} timer={timer} stacked={arrange === "rows"} />
  ));
  return (
    <KitCard part="root" padded>
      {tiles.length === 1 ? tiles : <KitGrid arrange={arrange}>{tiles}</KitGrid>}
    </KitCard>
  );
}
