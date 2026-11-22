import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { scoreboardCopy, scoreboardReading } from "../copy";
import { sportsWordsFor } from "../lang";
import { scoreboardRecord } from "../match-runtime";
import { prompt } from "../../../entry/prompt-Scoreboard.generated";

const number = z.int().nonnegative();
const sports = ["football", "basketball", "baseball", "tennis", "hockey", "generic"] as const;
const bases = ["first", "second", "third"] as const;

// Core first: Counter/count adjusts one value, not two sides with a shared match clock and status.
export const meta = {
  id: "Scoreboard",
  status: "ready",
  group: "data",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 2,
  tier: "phone",
  partTiers: { root: "people" },
  realPath: "One phone keeps the score; following it live elsewhere needs a shared app.",
  variants: {
    emphasis: ["normal", "quiet"],
    detail: ["full", "brief"],
  },
  variantParts: { "detail.brief": { hides: ["period"] } },
  // prettier-ignore
  parts: ["root", "scores", "home", "away", "home_score", "away_score",
    "clock", "clock_icon", "clock_value", "period", "status", "sport", "periods", "possession",
    "outs", "balls", "strikes", "bases"],
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
    sport: z.enum(sports).optional(),
    periods: z
      .array(z.strictObject({ label: c.text(12), home: number, away: number }))
      .min(1)
      .max(12)
      .optional(),
    possession: z.enum(["home", "away"]).optional(),
    outs: z.int().min(0).max(2).optional(),
    balls: z.int().min(0).max(3).optional(),
    strikes: z.int().min(0).max(2).optional(),
    bases: z.array(z.enum(bases)).min(0).max(3).optional(),
  })
  .refine(
    ({ sport, outs, balls, strikes, bases }) =>
      sport === "baseball" || [outs, balls, strikes, bases].every((value) => value === undefined),
    { path: ["sport"], message: "The count and occupied bases require baseball." },
  )
  .refine(({ bases }) => !bases || new Set(bases).size === bases.length, { path: ["bases"] })
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
  {
    home: "Ledge Rovers",
    away: "Fern House",
    homeScore: 48,
    awayScore: 39,
    status: "live",
    sport: "basketball",
    period: "Q3",
    possession: "away",
    periods: [
      { label: "Q1", home: 22, away: 19 },
      { label: "Q2", home: 26, away: 20 },
    ],
  },
  {
    home: "Trot Town",
    away: "River Rovers",
    homeScore: 4,
    awayScore: 2,
    status: "live",
    sport: "baseball",
    period: "Top 7th",
    outs: 2,
    balls: 3,
    strikes: 1,
    bases: ["first", "third"],
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
  {
    ...write("Follow the live basketball score: Trot Town 48, River Rovers 39, in the third quarter."),
    expectProps: { sport: "basketball" },
  },
  {
    ...write(
      "Follow live basketball: Trot Town 48, River Rovers 39. The period breakdown is Q1: 22–19, Q2: 26–20, home first.",
    ),
    expectProps: {
      periods: [
        { label: "Q1", home: 22, away: 19 },
        { label: "Q2", home: 26, away: 20 },
      ],
    },
  },
  {
    ...write(
      "Show a live basketball score with home Trot Town 48, away River Rovers 39. River Rovers have possession.",
    ),
    expectProps: { possession: "away" },
  },
  {
    ...write("Show live baseball, Trot Town 4, River Rovers 2, Top 7th with two outs."),
    expectProps: { outs: 2 },
  },
  {
    ...write("Show live baseball, Trot Town 4, River Rovers 2, Top 7th. Three balls on the batter."),
    expectProps: { balls: 3 },
  },
  {
    ...write("Show live baseball, Trot Town 4, River Rovers 2, Top 7th. One strike on the batter."),
    expectProps: { strikes: 1 },
  },
  {
    ...write(
      "Show live baseball, Trot Town 4, River Rovers 2, Top 7th. Runners occupy first and third, in that order.",
    ),
    expectProps: { bases: ["first", "third"] },
  },
  read("Add a goal for Ledge Rovers, the home side", { address: "s1/home", action: "increment" }),
  read("Undo one goal for the away side", { address: "s1/away", action: "decrement" }),
  read("The match clock is stopped. Start the clock now.", { address: "s1/clock", action: "start" }),
] satisfies c.Probe[];

type ScoreView = c.Props<typeof props, typeof meta> & { elapsed?: number; running?: boolean };

// prettier-ignore
function ScoreCenter({ input, lang }: { input: ScoreView; lang: string }) {
  const { status, clock } = scoreboardCopy(input, lang);
  const density = kit.useKit().density;
  const emphasis = kit.useVariant("emphasis", meta.variants.emphasis, input.emphasis);
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  return (
    <kit.KitContent align="center" density={density}>
      <kit.KitText part="status" role="label" align="center" {...{ density, emphasis }}
        tone={input.status === "live" && emphasis !== "quiet" ? "good" : "muted"}>
        {status}
      </kit.KitText>
      {clock && <kit.KitText part={input.style === "keeper" ? "clock_value" : "clock"}
        role="number" numberScale="compact" align="center" density={density} tabular>{clock}</kit.KitText>}
      {input.period && detail === "full" && (
        <kit.KitText part="period" role="caption" tone="muted" align="center" density={density}>
          {input.period}
        </kit.KitText>
      )}
    </kit.KitContent>
  );
}

function ScoreDetails({ input, density }: { input: ScoreView; density: c.ThemeDensity }) {
  const { lang, words } = kit.useWords(sportsWordsFor);
  const { facts, periods } = scoreboardCopy(input, lang);
  if (!facts.length && !periods.length) return null;
  const content = (
    <kit.KitContent group="response" density={density}>
      {facts.length > 0 && (
        <kit.KitContent density={density}>
          {facts.map(({ part, text }) => (
            <kit.KitLayoutText
              key={part}
              line={{ part, text, role: "meta", tone: "muted" }}
              density={density}
            />
          ))}
        </kit.KitContent>
      )}
      {periods.length > 0 && (
        <kit.KitContent group={facts.length ? "response" : "content"} rhythm="flush" density={density}>
          <kit.KitHeader
            title={{ text: words.scoreboard.periods, part: "periods", role: "body", strong: true }}
            density={density}
          />
          <kit.KitRowGroup density={density}>
            {periods.map(({ label, score }, index) => (
              <kit.KitRow
                key={index}
                part={null}
                label={label}
                inline
                fitContent
                inset="none"
                density={density}
                trailing={
                  <kit.KitLayoutText align="end" line={{ text: score, role: "body", tabular: true }} />
                }
              >
                <kit.KitLayoutText line={{ text: label, role: "body" }} />
              </kit.KitRow>
            ))}
          </kit.KitRowGroup>
        </kit.KitContent>
      )}
    </kit.KitContent>
  );
  return (
    <kit.KitState loading={content} density={density}>
      {content}
    </kit.KitState>
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
  const density = kit.useKit().density;
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
      <ScoreDetails {...{ input, density }} />
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
