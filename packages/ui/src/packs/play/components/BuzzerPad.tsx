import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { buzzerPadCopy } from "../copy";
import { playWordsFor } from "../lang";

// Core first: Timer/up measures elapsed time, not which player's touch arrived first.
export const meta = {
  id: "BuzzerPad",
  status: "ready",
  group: "action",
  purpose: "Lock in the first player to buzz and show how much later others tapped.",
  pick: "Arbitrate who buzzes first in an in-person quiz or reaction round on one phone. Not one elapsed time (Timer), ordered turns (TurnOrder), random picks (Spinner), or question display (Trivia).",
  writeHints: [
    "Write the players, swatches, and an optional public prompt. Never write a winner, lock state, or timestamps.",
    'For stacked horizontal pads write {"arrange":"rows","density":null,"surface":null}; the default grid spreads pads around the corners.',
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "One device locks the first touch and measures later taps against its monotonic timestamp.",
  variants: { arrange: ["grid", "rows"], density: ["comfortable", "compact"], surface: ["card", "outlined"] },
  parts: ["root", "prompt", "winner", "status", "reset"],
  items: { key: "players", parts: ["root", "buzz", "name", "icon", "result", "delta"] },
  states: ["filled", "loading", "success"],
  actions: { parts: { reset: ["press"] }, items: { buzz: ["press"] } },
  buzz: { press: "buzz", reset: "reset" },
  // Lock the winner, not the remaining players' chance to register a reaction time.
  successActions: ["buzz.press", "reset.press"],
  readSuccess: true,
  read: (input, _state, lang): string[] => {
    const { players, [c.buzzKey]: round } = input as Setup & { [c.buzzKey]?: c.BuzzRound };
    const { status, pads, reset } = buzzerPadCopy(players, round, lang);
    return [
      status,
      ...new Set(pads.flatMap(({ delta, caption }) => (delta ? [] : [caption]))),
      ...pads.flatMap(({ name, delta }) => (delta ? [name, delta] : [])),
      reset,
    ];
  },
} as const satisfies c.Meta;

export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  players: z
    .array(z.strictObject({ name: c.text(16), swatch: z.enum(c.swatchNames) }))
    .min(2)
    .max(4),
  prompt: c.text(48).optional(),
});

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const items = c.itemsOf(cast, 2);
  const players = (["grey", "navy"] as const).map((swatch, i) => ({
    name: (items[i] ? c.titleOf(items[i], 16, thing) : undefined) ?? c.placeholderTitle(i, lang),
    swatch,
  }));
  return { players };
}

export const examples = [
  {
    prompt: "Name that leaf",
    players: [
      { name: "Fern team", swatch: "green" },
      { name: "Pothos team", swatch: "yellow" },
    ],
  },
  {
    arrange: "rows",
    players: [
      { name: "Clover", swatch: "blue" },
      { name: "Juniper", swatch: "purple" },
      { name: "Otis", swatch: "orange" },
    ],
  },
  {
    prompt: "Name a trail trick",
    density: "compact",
    surface: "outlined",
    players: [
      { name: "Clover", swatch: "blue" },
      { name: "Juniper", swatch: "purple" },
      { name: "Otis", swatch: "orange" },
      { name: "Willow", swatch: "navy" },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("BuzzerPad");
export const probes = [
  choose(
    "Give each player a buzzer on the same phone, lock the first tap as the winner and show later taps' reaction gaps.",
  ),
  choose("Give the host one stopwatch that counts up during the quiz; no player taps or winner.", "Timer"),
  write(
    "Create a two-player quiz buzzer with Fern team in green and Pothos team in yellow. The prompt is Name that leaf.",
  ),
  {
    ...write("Give Fern team in green and Pothos team in yellow buzzers stacked in horizontal rows."),
    variant: { axis: "arrange", value: "rows" },
  },
  read("Buzz in as Fern team", { address: "b1/r1/buzz", action: "press" }),
] satisfies c.Probe[];

type Setup = c.Props<typeof props, typeof meta>;
type Density = NonNullable<Setup["density"]>;
type Pad = ReturnType<typeof buzzerPadCopy<Setup["players"][number]>>["pads"][number];

function PlayerPad({ pad, density }: { pad: Pad; density: Density }) {
  const scope = kit.usePartContext();
  const loading = kit.useComponentState() === "loading";
  const surface = loading || (pad.used && !pad.first) ? "outlined" : "tinted";
  const caption = <PadResult pad={pad} density={density} loading={loading} />;
  return (
    <kit.PartScope {...scope} item={pad.id}>
      <kit.KitCard
        part="root"
        surface={surface}
        density={density}
        padded={loading || density === "compact"}
        inset="none"
      >
        {loading ? (
          <kit.KitContent align="center" density={density}>
            <kit.KitPhoto shape="round" part={null} loading />
            <kit.KitLayoutText line={{ text: pad.name, role: "meta" }} align="center" density={density} />
            {caption}
          </kit.KitContent>
        ) : (
          <kit.KitTile
            item={pad.id}
            icon={pad.first ? "check" : pad.used ? "clock" : "zap"}
            label={pad.name}
            labelPart="name"
            badgeTone={pad.first ? "muted" : "accent"}
            disabled={pad.used}
            touchTarget="buzz"
            detail={caption}
            density={density}
          />
        )}
      </kit.KitCard>
    </kit.PartScope>
  );
}

function PadResult({ pad, density, loading }: { pad: Pad; density: Density; loading: boolean }) {
  const { words } = kit.useWords(playWordsFor);
  const mark = (
    <kit.KitCard part="result" swatch={pad.swatch}>
      <kit.KitIcon name="dot" scale="sm" decorative loading={loading} />
    </kit.KitCard>
  );
  return (
    <kit.KitContent align="center" density={density}>
      <kit.KitContent lead={mark} leadingAlign="row" density={density}>
        {pad.time === undefined ? (
          <kit.KitLayoutText
            line={{ text: pad.caption, role: "caption", tone: pad.used ? "muted" : "text" }}
            density={density}
          />
        ) : (
          <kit.KitText part="delta" role="caption" tone="muted" density={density}>
            <kit.KitText part={null} role="number" numberScale="compact" tabular density={density}>
              {pad.time}
            </kit.KitText>
            {words.buzzerPad.delta("")}
          </kit.KitText>
        )}
      </kit.KitContent>
    </kit.KitContent>
  );
}

function BuzzerControls({
  setup,
  copy,
  density,
}: {
  setup: Setup;
  copy: ReturnType<typeof buzzerPadCopy<Setup["players"][number]>>;
  density: Density;
}) {
  const loading = kit.useComponentState() === "loading";
  const pads = copy.pads.map((pad) => <PlayerPad key={pad.id} pad={pad} density={density} />);
  return (
    <>
      {setup.arrange === "rows" ? (
        <kit.KitRowGroup spacing="groups" separators={false} density={density}>
          {pads}
        </kit.KitRowGroup>
      ) : (
        <kit.KitGrid columns={2} density={density} list>
          {pads}
        </kit.KitGrid>
      )}
      <kit.KitContent group="response" density={density}>
        <kit.KitActionFooter density={density}>
          <kit.KitAction part={loading ? null : "reset"} action="press" kind="danger" label={copy.reset} />
        </kit.KitActionFooter>
      </kit.KitContent>
    </>
  );
}

export function BuzzerPad(setup: Setup) {
  const { lang } = kit.useWords(playWordsFor);
  const { screen, component } = kit.usePartContext();
  const state = kit.useComponentState();
  const density = kit.useVariant("density", meta.variants.density, setup.density);
  const stored = kit.useControlValue<unknown>(`${screen}/${component}/${c.buzzKey}`, undefined);
  const round = c.buzzRound(meta, setup, () => stored);
  const copy = buzzerPadCopy(setup.players, round, lang);
  const header = setup.prompt && (
    <kit.KitHeader
      title={{ text: setup.prompt, part: "prompt", ...(round && { role: "caption", tone: "muted" }) }}
      density={density}
    />
  );
  const waiting = (
    <kit.KitLayoutText
      line={{ text: copy.status, part: "status", role: "meta", tone: "muted" }}
      density={density}
    />
  );
  const controls = <BuzzerControls {...{ setup, copy, density }} />;
  return (
    <kit.KitCard part="root" padded density={density} surface={setup.surface}>
      {state === "loading" ? (
        <kit.KitState
          density={density}
          loading={
            <>
              {header}
              {waiting}
              {controls}
            </>
          }
        />
      ) : (
        <>
          {round && state === "success" ? (
            <kit.KitState retain part="winner" message={copy.status} density={density}>
              {header}
              {controls}
            </kit.KitState>
          ) : (
            <>
              {header}
              {waiting}
              {controls}
            </>
          )}
        </>
      )}
    </kit.KitCard>
  );
}
