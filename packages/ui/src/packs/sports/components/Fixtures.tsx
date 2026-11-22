import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { fixtureCopy, fixtureReading } from "../copy";
import { sportsWordsFor } from "../lang";

// Core first: Calendar/week shows dates, not opponents, venues and results or a full next-match card.
export const meta = {
  id: "Fixtures",
  status: "ready",
  group: "data",
  purpose: "See who we play next and how recent matches ended.",
  pick: "A team’s fixture schedule and results: opponents, venues and home or away, or one next-match card with meet time and kit. Not dates alone (Calendar), live scoring (Scoreboard), an appointment (Appointment) or a community event (EventCard).",
  writeHints: [
    "Order matches by date and kickoff time. In next style put the next match first. Supply both scores for a result, or neither for an unplayed match.",
    'For a single next match use style "next". Write density: null unless asked to change spacing, even when changing detail.',
    'If asked to hide venue, meet time or kit from the preview, write {"detail":"brief","density":null} and keep the supplied values in the match. Otherwise use detail: null.',
    'For a multi-match score ticker use style "scoreboard". Mark in-progress matches with live: true; clock is the fixture’s displayed game time, not its kickoff time.',
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  partTiers: { root: "people" },
  realPath: "The captain enters fixtures on one phone; teammates following them need a shared app.",
  variants: { density: ["comfortable", "compact"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["venue", "meet", "kit"] } },
  parts: ["root", "message"],
  items: {
    key: "matches",
    parts: [
      "root",
      "date",
      "time",
      "opponent",
      "badge",
      "side",
      "venue",
      "score",
      "result",
      "meet",
      "kit",
      "live",
      "clock",
    ],
    visibleWhen: { visible: true },
  },
  states: ["filled", "empty", "loading"],
  emptyActions: [],
  actions: { items: { root: ["press"] } },
  read: (input, _state, lang): string[] => fixtureReading((input as z.output<typeof props>).matches, lang),
} as const satisfies c.Meta;

// prettier-ignore
const match = z.strictObject({
  date: c.isoDate, time: c.clock, opponent: c.text(24), home: z.boolean(), venue: c.text(28).optional(),
  us: z.int().nonnegative().optional(), them: z.int().nonnegative().optional(),
  meet: c.clock.optional(), kit: c.text(16).optional(), goto: c.screenId,
  live: z.boolean().optional(), clock: c.text(12).optional(),
});
export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    matches: z.array(match).min(1).max(6),
    style: z.enum(["list", "next", "scoreboard"]).default("list"),
  })
  .refine(({ matches }) => matches.every(({ us, them }) => (us === undefined) === (them === undefined)), {
    path: ["matches"],
  })
  .overwrite((input) => ({
    ...input,
    matches: input.matches.map((row, index) => ({
      ...row,
      ...(input.detail === "brief" || input.style !== "next" ? { meet: undefined, kit: undefined } : {}),
      ...(input.detail === "brief" ? { venue: undefined } : {}),
      visible: input.style !== "next" || index === 0,
    })),
  }));

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const opponents = c
    .itemsOf(cast, 3)
    .map((item, index) => c.titleOf(item, 24, thing) || c.placeholderTitle(index, lang));
  return {
    matches: (opponents.length ? opponents : [c.placeholderTitle(0, lang)]).map((opponent) => ({
      date: "2026-11-22",
      time: "09:00",
      opponent,
      home: true,
      goto: "details",
    })),
  };
}

const nextMatch = {
  date: "2026-11-22",
  time: "10:00",
  opponent: "River Rovers",
  home: true,
  venue: "Trot Field",
  meet: "09:40",
  kit: "Blue shirts",
  goto: "river_match",
} as const;
// prettier-ignore
export const examples = [
  {
    matches: [
      { date: "2026-11-15", time: "10:00", opponent: "Fern House", home: false, us: 3, them: 1, goto: "fern_match" },
      { date: "2026-11-22", time: "10:00", opponent: "Garden Crew", home: true, venue: "Ledge Park", goto: "garden_match" },
    ],
  },
  { style: "next", matches: [nextMatch] },
  { style: "next", density: "compact", matches: [nextMatch] },
  { style: "next", detail: "brief", matches: [nextMatch] },
  { style: "scoreboard", matches: [
    { ...nextMatch, us: 2, them: 1, live: true, clock: "67′" },
    { ...nextMatch, opponent: "North Rovers", home: false, goto: "north_match" },
  ] },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Fixtures");
export const probes = [
  choose(
    "Show our club's last few football results and upcoming matches, with opponents and home or away grounds.",
  ),
  choose(
    "Show a month grid and mark which dates have training. No opponents, venues or match results.",
    "Calendar",
  ),
  write(
    "Show our next match at home against River Rovers on 2026-11-22 at 10:00. Meet at 09:40 at Trot Field, blue shirts, and link the match to river_match.",
  ),
  {
    ...write(
      "Show the next match against North Rovers on 2026-11-29 at 11:00 away, linked to north_match. Keep West Field, 10:40 meet and white shirts in the data but hide venue, meet and kit from the preview.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  {
    ...write(
      "Make a multi-match score ticker: home River Rovers 2–1 and away North Rovers 0–0. Both kickoffs are 10:00 on 2026-11-22; link them to river_match and north_match.",
    ),
    expectProps: { style: "scoreboard" },
  },
  {
    ...write(
      "List one home fixture against River Rovers on 2026-11-22, kickoff 10:00, linked to river_match. It's in progress at 2–1. Mark it live.",
    ),
    expectProps: { matches: [{ live: true }] },
  },
  {
    ...write(
      "Show the home fixture against River Rovers on 2026-11-22, kickoff 10:00 and link river_match. Game is live and the game clock reads exactly Q3 04:12.",
    ),
    expectProps: { matches: [{ clock: "Q3 04:12" }] },
  },
  read("Open the away match against Fern House", { address: "f1/r1", action: "press" }),
] satisfies c.Probe[];

type FixturesProps = c.Props<typeof props, typeof meta>;
type Match = FixturesProps["matches"][number];
type Density = c.AxisValue<"density">;

function FixtureLive({ density }: { density: Density }) {
  const { words } = kit.useWords(sportsWordsFor);
  return <kit.KitTrail kind="badge" part="live" tone="good" value={words.fixtureLive} density={density} />;
}

// prettier-ignore
function TickerRow({ row, density, loading }: { row: Match; density: Density; loading: boolean }) {
  const { lang, words } = kit.useWords(sportsWordsFor);
  const { date, time, side, score, result, initials } = fixtureCopy(row, lang);
  return <kit.KitRow item={row.id} label={row.opponent} goto={loading ? undefined : row.goto}
    part={loading ? null : "root"} density={density} inset="none">
    <kit.KitGrid fitLast density={density}>
      <kit.KitContent density={density} leadingAlign="row" lineRole="body"
        lead={loading ? <kit.KitSkeleton shape="control" /> :
          <kit.KitPhoto shape="round" initials={initials} label={row.opponent} part="badge" />}>
        <kit.KitMetaLine density={density}
          title={{ text: row.opponent, part: "opponent", role: "body", strong: true }}
          meta={{ text: date, part: "date", tabular: true }} />
        <FixtureKickoff {...{ time, side, density, loading }} separator={words.fixtureSeparator} />
        <kit.KitLayoutText line={{ text: row.venue, part: "venue", role: "meta", tone: "muted" }} density={density} />
      </kit.KitContent>
      {(score || row.live || row.clock) && <kit.KitContent density={density}>
        <kit.KitFigure value={{ text: score, part: "score", compact: true }} density={density} align="end" />
        <kit.KitLayoutText align="end" density={density} line={{ text: row.clock, part: "clock", role: "meta", tabular: true }} />
        {result && <kit.KitTrail kind="badge" part="result" tone={result.tone} value={result.label} density={density} />}
        {row.live && <FixtureLive density={density} />}
      </kit.KitContent>}
    </kit.KitGrid>
  </kit.KitRow>;
}

// prettier-ignore
function FixtureKickoff({ venue, time, side, density, loading, separator }: {
  venue?: string | undefined; time: string; side: string; density: Density; loading: boolean; separator: string;
}) {
  if (loading) return <kit.KitLayoutText density={density} line={{
    text: [time, side, venue].filter(Boolean).join(separator), role: "meta",
  }} />;
  return <kit.KitText part={null} role="label" tone="muted" density={density}>
    <kit.KitText part="time" role="label" tone="muted" density={density} tabular>{time}</kit.KitText>
    {separator}<kit.KitText part="side" role="label" tone="muted" density={density}>{side}</kit.KitText>
    {venue && <>{separator}<kit.KitText part="venue" role="label" tone="muted" density={density}>{venue}</kit.KitText></>}
  </kit.KitText>;
}

// prettier-ignore
function MatchRow({ row, next, density, loading }: { row: Match; next: boolean; density: Density; loading: boolean }) {
  const { lang, words } = kit.useWords(sportsWordsFor);
  const { date, time, side, meet, clothing, score, result, initials } = fixtureCopy(row, lang);
  const role = next ? "title" : "heading";
  const badge = loading ? <kit.KitSkeleton shape="control" />
    : <kit.KitPhoto shape="round" initials={initials} label={row.opponent} part="badge" />;
  const kickoff = [time, side, row.venue].filter(Boolean).join(words.fixtureSeparator);
  const details = (
    <kit.KitContent density={density} lead={badge} leadingAlign="row" lineRole={role}>
      {loading ? <kit.KitSkeleton shape="figure" density={density} inset="none"
        content={[[role, row.opponent], ["label", date], ["label", kickoff]]} />
        : <>
          <kit.KitText part="opponent" role={role} density={density}>{row.opponent}</kit.KitText>
          <kit.KitText part="date" role="label" tone="muted" density={density} tabular>{date}</kit.KitText>
          <FixtureKickoff {...{ time, side, density, loading }} venue={row.venue} separator={words.fixtureSeparator} />
        </>}
    </kit.KitContent>
  );
  return (
    <kit.KitRow item={row.id} label={loading ? "" : row.opponent} goto={loading ? undefined : row.goto}
      part={loading ? null : "root"} inline density={density} lineRole={role}>
      {score || row.live || row.clock ? <kit.KitGrid fitLast density={density}>
        {details}
        <kit.KitContent align="center" density={density}>
          {score && <kit.KitLayoutText line={{ text: score, part: "score", role: "figure", compact: true, tabular: true }}
            align="center" density={density} />}
          {result && <kit.KitTrail kind="badge" part="result" tone={result.tone} value={result.label} density={density} />}
          <kit.KitLayoutText align="center" density={density} line={{ text: row.clock, part: "clock", role: "meta", tabular: true }} />
          {row.live && <FixtureLive density={density} />}
        </kit.KitContent>
      </kit.KitGrid> : details}
      {(meet || clothing) && <kit.KitContent group="response" density={density}>
        {loading ? <kit.KitSkeleton shape="figure" density={density} inset="none" content={[["label", meet], ["label", clothing]]} />
          : <>
            {meet && <kit.KitText part="meet" role="label" density={density}>{meet}</kit.KitText>}
            {clothing && <kit.KitText part="kit" role="label" density={density}>{clothing}</kit.KitText>}
          </>}
      </kit.KitContent>}
    </kit.KitRow>
  );
}

// prettier-ignore
export function Fixtures(input: FixturesProps) {
  const state = kit.useComponentState();
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const next = input.style === "next";
  const ticker = input.style === "scoreboard";
  const rows = next ? input.matches.slice(0, 1) : input.matches;
  const loading = state === "loading";
  const content = ticker ? <kit.KitRowGroup density={density}>
    {rows.map((row) => <TickerRow key={row.id} {...{ row, density, loading }} />)}
  </kit.KitRowGroup> : <kit.KitRowGroup density={density} spacing="groups" separators={false}>
    {rows.map((row) => <MatchRow key={row.id} {...{ row, next, density, loading }} />)}
  </kit.KitRowGroup>;
  return (
    <kit.KitCard part="root" padded={state !== "empty"} density={density}>
      <kit.KitState icon="calendar" part="message" density={density} loading={content}>{content}</kit.KitState>
    </kit.KitCard>
  );
}
