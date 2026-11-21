import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { scoreboardCopy, scoreboardReading } from "../copy";
import { sportsWordsFor } from "../lang";
import { scoreboardRecord } from "../match-runtime";

const number = z.int().nonnegative();

// Core first: Counter/count adjusts one value, not two sides with a shared match clock and status.
export const meta = {
  id: "Scoreboard",
  status: "ready",
  group: "data",
  purpose: "Follow the current score or keep score for both sides.",
  pick: "The score and match clock for one contest between a home side and an away side. Not a practice result (Result), one adjustable count (Counter) or a standalone clock (Timer).",
  writeHints: [
    'Use style "keeper" only when a scorekeeper must change scores or operate the clock. Use "display" for following the match. On a screen with MatchFeed, each score must equal its side’s seeded goal count.',
    'To hide just the written period, write {"detail":"brief","density":null,"emphasis":null}. Keep the period in the data and keep the scores, status and clock visible. Never write an axis default; leave every unrequested axis null.',
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  partTiers: { root: "people" },
  realPath: "One phone keeps the score; following it live elsewhere needs a shared app.",
  variants: {
    density: ["comfortable", "compact"],
    emphasis: ["normal", "quiet"],
    detail: ["full", "brief"],
  },
  variantParts: { "detail.brief": { hides: ["period"] } },
  // prettier-ignore
  parts: ["root", "scores", "home", "away", "home_score", "away_score",
    "clock", "clock_icon", "clock_value", "period", "status"],
  states: ["filled", "loading"],
  signature: "count_up",
  actions: {
    parts: { home: ["increment", "decrement"], away: ["increment", "decrement"], clock: ["start", "stop"] },
    when: { home: { style: "keeper" }, away: { style: "keeper" }, clock: { style: "keeper" } },
  },
  confirmParts: ["home", "away"],
  ...scoreboardRecord,
  live: { derive: () => ({ $liveClock: true }) },
  clocks: [
    {
      id: "match_clock",
      kind: "up",
      prop: "elapsed",
      runningProp: "running",
      when: { $liveClock: true },
      start: { part: "clock", action: "start" },
      stop: { part: "clock", action: "stop" },
    },
  ],
  read: scoreboardReading,
} as const satisfies c.Meta;

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    home: c.text(20),
    away: c.text(20),
    homeScore: number,
    awayScore: number,
    period: c.text(12).optional(),
    status: z.enum(["upcoming", "live", "break", "final"]),
    style: z.enum(["display", "keeper"]).default("display"),
  })
  // Mark parsed inputs for the clock without adding a field to wire snapshots or pack validators.
  .overwrite((value) => Object.defineProperty(value, "$liveClock", { value: true }));

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const teams = c.itemsOf(cast, 2);
  const label = (index: number) =>
    (teams[index] && c.titleOf(teams[index], 20, thing)) || c.placeholderTitle(index, lang);
  return { home: label(0), away: label(1), homeScore: 0, awayScore: 0, status: "upcoming" };
}

export const examples = [
  {
    home: "Ledge Rovers",
    away: "Fern House",
    homeScore: 2,
    awayScore: 1,
    period: "Second half",
    status: "live",
    style: "keeper",
  },
  {
    home: "Trot Town",
    away: "River Rovers",
    homeScore: 3,
    awayScore: 3,
    status: "final",
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Scoreboard");
export const probes = [
  choose(
    "Show the live football score for both sides with the match period and let the scorekeeper adjust either side.",
  ),
  choose(
    "Give me one big tally of laps, with plus and minus to change it. There is only a single count.",
    "Counter",
  ),
  write(
    "Keep the live score of Trot Town 2, River Rovers 1 in the second half, with controls to add or undo a point for either side and start or stop the match clock.",
  ),
  {
    ...write(
      "Show Trot Town leading River Rovers 2 to 1 live. Keep Second half on file, but show only the scores, live status and running time, without the written period.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Add a goal for Ledge Rovers, the home side", { address: "s1/home", action: "increment" }),
  read("Undo one goal for the away side", { address: "s1/away", action: "decrement" }),
  read("Start, not stop, the match clock", { address: "s1/clock", action: "start" }),
] satisfies c.Probe[];

type ScoreView = c.Props<typeof props, typeof meta> & { elapsed?: number; running?: boolean };

// prettier-ignore
function ScoreCenter({ input, lang }: { input: ScoreView; lang: string }) {
  const { status, clock } = scoreboardCopy(input, lang);
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const emphasis = kit.useVariant("emphasis", meta.variants.emphasis, input.emphasis);
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  return (
    <kit.KitContent align="center" density={density}>
      <kit.KitText part="status" role="label" align="center" {...{ density, emphasis }}
        tone={input.status === "live" && emphasis !== "quiet" ? "good" : "muted"}>
        {status}
      </kit.KitText>
      <kit.KitText part={input.style === "keeper" ? "clock_value" : "clock"}
        role="number" numberScale="compact" align="center" density={density} tabular>
        {clock}
      </kit.KitText>
      {input.period && detail === "full" && (
        <kit.KitText part="period" role="caption" tone="muted" align="center" density={density}>
          {input.period}
        </kit.KitText>
      )}
    </kit.KitContent>
  );
}

export function Scoreboard(seed: c.Props<typeof props, typeof meta>) {
  // React copies enumerable props, so opt in again at the view's projection boundary.
  const input = kit.useLiveControls(meta, { ...seed, $liveClock: true }) as ScoreView;
  const loading = kit.useComponentState() === "loading";
  const {
    lang,
    words: { scoreboard },
  } = kit.useWords(sportsWordsFor);
  const { loadingLabel } = c.wordsFor(lang);
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const { home, away } = scoreboardCopy(input, lang);
  const clockLabel = input.running ? scoreboard.stop : scoreboard.start;
  // prettier-ignore
  const side = (part: "home" | "away", value: string) => {
    const label = input[part];
    return { label, value, valuePart: `${part}_score`, controls: input.style === "keeper" && (loading ? (
      <><kit.KitSkeleton shape="control" /><kit.KitSkeleton shape="control" /></>
    ) : (
      <kit.KitStepper part={part} value={input[`${part}Score`]} min={0} max={Number.MAX_SAFE_INTEGER}
        labels={{ less: scoreboard.undo(label), more: scoreboard.add(label) }} />
    )) };
  };
  return (
    <kit.KitCard part="root" padded density={density} {...(loading ? { label: loadingLabel } : {})}>
      <kit.KitScore
        part="scores"
        loading={loading}
        style={input.style}
        sides={[side("home", home), side("away", away)]}
        center={<ScoreCenter {...{ input, lang }} />}
      />
      {input.style === "keeper" && (
        <ScoreClock {...{ density, loading, clockLabel }} running={input.running === true} />
      )}
    </kit.KitCard>
  );
}

// prettier-ignore
function ScoreClock({ density, loading, clockLabel, running }: {
  density: c.ThemeDensity; loading: boolean; clockLabel: string; running: boolean;
}) {
  return <kit.KitContent align="center" density={density} group={density === "compact" ? "content" : "response"}>
    <kit.KitRow inline part={null} label={clockLabel} density={density}>
      {loading ? <kit.KitSkeleton shape="control" kind="secondary" /> : (
        <kit.KitAction part="clock" kind="secondary" icon={running ? "pause" : "play"}
          action={running ? "stop" : "start"} a11y={clockLabel} />
      )}
    </kit.KitRow>
  </kit.KitContent>;
}
