import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { lifeCounterLines, lifeCounterResult } from "../copy";
import { playWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-LifeCounter.generated";

const lifeBounds = { min: -999, max: 9999 };
const counterBounds = { min: 0, max: 99 };
const lifeAdjust = { prop: "life", ...lifeBounds };
const counterStep = { prop: "value", step: 1, ...counterBounds };
const quickSteps = [-5, 5] as const;

// Core first: Counter/default supports one fixed-step total, not opposing seats with separate resources.
export const meta = {
  id: "LifeCounter",
  status: "ready",
  group: "input",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "One device keeps each seat's live totals and resources for the current match.",
  variants: { arrange: ["rows", "grid"] },
  parts: ["root", "result", "reset"],
  states: ["filled", "loading", "success"],
  items: {
    key: "players",
    parts: [
      "root",
      "name",
      "total",
      "life",
      "life_minus_5",
      "life_plus_5",
      "counter_1",
      "counter_2",
      "counter_3",
      "less_1",
      "less_2",
      "less_3",
      "more_1",
      "more_2",
      "more_3",
    ],
    adjust: {
      "life.increment": { ...lifeAdjust, delta: 1 },
      "life.decrement": { ...lifeAdjust, delta: -1 },
      "life_plus_5.increment": { ...lifeAdjust, delta: 5 },
      "life_minus_5.decrement": { ...lifeAdjust, delta: -5 },
    },
    nested: {
      key: "counters",
      parts: {
        less: { ...counterStep, action: "decrement" },
        more: { ...counterStep, action: "increment" },
      },
    },
    reset: "reset",
  },
  actions: {
    parts: { reset: ["press"] },
    items: { life: ["increment", "decrement"], life_minus_5: ["decrement"], life_plus_5: ["increment"] },
  },
  confirmParts: ["reset"],
  successActions: ["reset.press"],
  readSuccess: true,
  live: {
    derive: (input) => {
      const result = lifeCounterResult(input as Match);
      return result ? { state: "success" } : {};
    },
  },
  read: (input, state, lang): string[] => {
    if (state === "loading") return [];
    const setup = input as Match;
    const words = playWordsFor(lang).lifeCounter;
    return [
      ...(state === "success" ? [resultLine(setup, words)] : []),
      ...lifeCounterLines(setup, lang),
      ...quickSteps.map((delta) => quickStepLabel(delta, words, lang)),
      words.reset,
    ];
  },
} as const satisfies c.Meta;

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    startingLife: z.int().min(1).max(999).default(20),
    players: z
      .array(
        z.strictObject({
          name: c.text(16),
          life: z.int().min(lifeBounds.min).max(lifeBounds.max).optional(),
          swatch: c.swatch.optional(),
          counters: z
            .array(
              z.strictObject({
                label: c.text(12),
                value: z.int().min(counterBounds.min).max(counterBounds.max),
              }),
            )
            .min(0)
            .max(3)
            .default([]),
        }),
      )
      .min(2)
      .max(6),
    flipTop: z.boolean().default(true),
    style: z.enum(["table", "stack"]).default("table"),
  })
  .overwrite((input) => ({
    ...input,
    players: input.players.map((seat) => ({ ...seat, life: seat.life ?? input.startingLife })),
  }));

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const players = c.itemsOf(cast, 2).map((item, i) => ({
    name: c.titleOf(item, 16, thing) ?? c.placeholderTitle(i, lang),
  }));
  while (players.length < 2) players.push({ name: c.placeholderTitle(players.length, lang) });
  return { players };
}

export const examples = [
  {
    players: [
      { name: "Fern", swatch: "green", counters: [{ label: "Water", value: 3 }] },
      { name: "Pothos", life: 18, counters: [{ label: "Water", value: 1 }] },
    ],
    style: "table",
  },
  {
    players: [{ name: "Clover" }, { name: "Juniper" }, { name: "Otis" }],
    startingLife: 30,
    flipTop: false,
    style: "stack",
  },
  {
    arrange: "grid",
    players: [
      { name: "Clover", life: 18, counters: [{ label: "Trail tokens", value: 3 }] },
      { name: "Juniper", life: 20, counters: [{ label: "Trail tokens", value: 2 }] },
      { name: "Otis", life: 15 },
      { name: "Willow", life: 22 },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("LifeCounter");
export const probes = [
  choose(
    "At a shared tabletop game, give each player quick life adjustments and their own resource counters.",
  ),
  choose("Let me add or remove one point from one running score.", "Counter"),
  write(
    "Track two players, Fern and Pothos, at 20 life each on a phone between them. Fern starts with three Water counters.",
  ),
  {
    ...write(
      "Track life for Fern, Pothos, Basil and Aloe. Put their life pads side by side in a two-column grid.",
    ),
    variant: { axis: "arrange", value: "grid" },
  },
  read("Reset the whole match to each player's starting life and resources", {
    address: "l1/reset",
    action: "press",
  }),
] satisfies c.Probe[];

type Setup = c.Props<typeof props, typeof meta>;
type Seat = Setup["players"][number];
type Words = ReturnType<typeof playWordsFor>["lifeCounter"];
type Match = Parameters<typeof lifeCounterLines>[0];

function resultLine(input: Match, words: Words) {
  const result = lifeCounterResult(input);
  return result?.winner ? words.winner(result.winner) : words.complete;
}

function quickStepLabel(delta: number, words: Words, lang?: string) {
  return words.step(delta > 0, c.numberLine(Math.abs(delta), lang));
}

function BigStep({
  delta,
  value,
  disabled,
}: {
  delta: (typeof quickSteps)[number];
  value: number;
  disabled: boolean;
}) {
  const {
    lang,
    words: { lifeCounter: words },
  } = kit.useWords(playWordsFor);
  const gain = delta > 0;
  const label = quickStepLabel(delta, words, lang);
  return (
    <kit.KitAction
      part={gain ? "life_plus_5" : "life_minus_5"}
      action={gain ? "increment" : "decrement"}
      kind="quiet"
      tone="neutral"
      label={label}
      contentParts={{}}
      disabled={disabled || (gain ? value >= lifeBounds.max : value <= lifeBounds.min)}
      full
    />
  );
}

function LifeControls({
  seat,
  value,
  disabled,
  loading,
}: {
  seat: string;
  value: number;
  disabled: boolean;
  loading: boolean;
}) {
  const {
    lang,
    words: { lifeCounter: words },
  } = kit.useWords(playWordsFor);
  const one = c.numberLine(1, lang);
  return (
    <kit.KitContent align="center">
      <kit.KitContent rhythm="flush">
        <kit.KitContent inset="md" align="center">
          {loading ? (
            <kit.KitActionFooter>
              <kit.KitSkeleton shape="control" />
              <kit.KitSkeleton shape="control" />
            </kit.KitActionFooter>
          ) : (
            <kit.KitStepper
              part="life"
              value={value}
              {...lifeBounds}
              disabled={disabled}
              labels={{
                less: words.adjust(seat, words.life, words.step(false, one)),
                more: words.adjust(seat, words.life, words.step(true, one)),
              }}
            />
          )}
        </kit.KitContent>
        <kit.KitGrid>
          {quickSteps.map((delta) =>
            loading ? (
              <kit.KitSkeleton key={delta} shape="control" kind="quiet" />
            ) : (
              <BigStep key={delta} {...{ delta, value, disabled }} />
            ),
          )}
        </kit.KitGrid>
      </kit.KitContent>
    </kit.KitContent>
  );
}

function Resource({
  counter,
  index,
  seat,
  disabled,
}: {
  counter: Seat["counters"][number];
  index: number;
  seat: string;
  disabled: boolean;
}) {
  const {
    lang,
    words: { lifeCounter: words },
  } = kit.useWords(playWordsFor);
  const slot = index + 1;
  const { value, label } = counter;
  return (
    <kit.KitContent align="center" rhythm="flush">
      <kit.KitText part={`counter_${slot}`} role="label" align="center">
        {words.counterLine(label, c.numberLine(value, lang))}
      </kit.KitText>
      <kit.KitGrid>
        <kit.KitAction
          part={`less_${slot}`}
          action="decrement"
          kind="quiet"
          icon="minus"
          contentParts={{}}
          a11y={words.adjust(seat, label, words.step(false, c.numberLine(1, lang)))}
          disabled={disabled || value <= counterBounds.min}
          full
        />
        <kit.KitAction
          part={`more_${slot}`}
          action="increment"
          kind="quiet"
          icon="plus"
          contentParts={{}}
          a11y={words.adjust(seat, label, words.step(true, c.numberLine(1, lang)))}
          disabled={disabled || value >= counterBounds.max}
          full
        />
      </kit.KitGrid>
    </kit.KitContent>
  );
}

function LifePad({
  seat,
  startingLife,
  opposing,
  disabled,
  loading,
  grid,
}: {
  seat: Seat;
  startingLife: number;
  opposing: boolean;
  disabled: boolean;
  loading: boolean;
  grid: boolean;
}) {
  const scope = kit.usePartContext();
  const { lang } = kit.useWords(playWordsFor);
  const value = seat.life ?? startingLife;
  const total = c.numberLine(value, lang);
  return (
    <kit.PartScope {...scope} item={seat.id}>
      <kit.KitCard
        part="root"
        padded
        inset={grid ? "none" : "md"}
        {...(!loading && { label: seat.name })}
        {...(opposing && { orientation: "opposing" })}
      >
        <SeatTotal {...{ seat, total, loading }} />
        <LifeControls seat={seat.name} {...{ value, disabled, loading }} />
        {loading ? (
          <PendingResources counters={seat.counters} />
        ) : (
          seat.counters.map((counter, index) => (
            <Resource key={index} {...{ counter, index, disabled }} seat={seat.name} />
          ))
        )}
      </kit.KitCard>
    </kit.PartScope>
  );
}

function SeatTotal({ seat, total, loading }: { seat: Seat; total: string; loading: boolean }) {
  return (
    <kit.KitContent align="center" rhythm="flush">
      <kit.KitCard
        part="name"
        padded
        surface="plain"
        {...(!loading && seat.swatch && { swatch: seat.swatch })}
      >
        <kit.KitLayoutText line={{ text: seat.name, role: "meta" }} align="center" />
      </kit.KitCard>
      <kit.KitLayoutText
        line={{ text: total, role: "figure", part: "total", tabular: true }}
        align="center"
      />
    </kit.KitContent>
  );
}

function PendingResources({ counters }: { counters: Seat["counters"] }) {
  return (
    <>
      {counters.map(({ label }, index) => (
        <kit.KitContent key={index} align="center" rhythm="flush">
          <kit.KitSkeleton shape="figure" inset="none" centered content={[["label", label]]} />
          <kit.KitGrid>
            <kit.KitSkeleton shape="control" kind="quiet" full />
            <kit.KitSkeleton shape="control" kind="quiet" full />
          </kit.KitGrid>
        </kit.KitContent>
      ))}
    </>
  );
}

export function LifeCounter(seed: Setup) {
  const input = kit.useLiveControls(meta, seed) as Setup;
  const state = kit.useComponentState();
  const {
    words: { lifeCounter: words },
  } = kit.useWords(playWordsFor);
  const arrange = kit.useVariant("arrange", meta.variants.arrange, input.arrange);
  const loading = state === "loading";
  const complete = state === "success" || (!loading && Boolean(lifeCounterResult(input)));
  const pads = (
    <kit.KitGrid arrange={arrange} list listRowGap="cards">
      {input.players.map((seat, index) => (
        <LifePad
          key={seat.id}
          seat={seat}
          startingLife={input.startingLife}
          disabled={complete}
          loading={loading}
          grid={arrange === "grid"}
          opposing={input.style === "table" && input.flipTop && index < Math.floor(input.players.length / 2)}
        />
      ))}
    </kit.KitGrid>
  );
  return (
    <kit.KitCard part="root" style="plain">
      <kit.KitContent group="response">
        {complete && (
          <kit.KitText part="result" role="label" align="center">
            {resultLine(input, words)}
          </kit.KitText>
        )}
        {pads}
        <kit.KitContent group="response">
          <kit.KitContent group="response">
            <kit.KitAction
              part={loading ? null : "reset"}
              action="press"
              kind="danger"
              label={words.reset}
              contentParts={{}}
              full
            />
          </kit.KitContent>
        </kit.KitContent>
      </kit.KitContent>
    </kit.KitCard>
  );
}
