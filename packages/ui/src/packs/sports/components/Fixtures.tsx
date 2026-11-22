import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { fixtureCopy, fixtureReading } from "../copy";
import { sportsWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-Fixtures.generated";

// Core first: Calendar/week shows dates, not opponents, venues and results or a full next-match card.
export const meta = {
  id: "Fixtures",
  status: "ready",
  group: "data",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
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
    parts: ["root", "date", "time", "opponent", "badge", "side", "venue", "score", "result", "meet", "kit"],
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
});
export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    matches: z.array(match).min(1).max(6),
    style: z.enum(["list", "next"]).default("list"),
  })
  .refine(({ matches }) => matches.every(({ us, them }) => (us === undefined) === (them === undefined)), {
    path: ["matches"],
  })
  .overwrite((input) => ({
    ...input,
    matches: input.matches.map((row, index) => ({
      ...row,
      ...(input.detail === "brief" || input.style === "list" ? { meet: undefined, kit: undefined } : {}),
      ...(input.detail === "brief" ? { venue: undefined } : {}),
      visible: input.style === "list" || index === 0,
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
  read("Open the away match against Fern House", { address: "f1/r1", action: "press" }),
] satisfies c.Probe[];

type FixturesProps = c.Props<typeof props, typeof meta>;
type Match = FixturesProps["matches"][number];
type Density = c.AxisValue<"density">;

// prettier-ignore
function MatchRow({ row, next, density, loading }: { row: Match; next: boolean; density: Density; loading: boolean }) {
  const { lang, words } = kit.useWords(sportsWordsFor);
  const { date, time, side, meet, clothing, result, initials } = fixtureCopy(row, lang);
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
          <kit.KitText part={null} role="label" tone="muted" density={density}>
            <kit.KitText part="time" role="label" tone="muted" density={density} tabular>{time}</kit.KitText>
            {words.fixtureSeparator}<kit.KitText part="side" role="label" tone="muted" density={density}>{side}</kit.KitText>
            {row.venue && <>{words.fixtureSeparator}<kit.KitText part="venue" role="label" tone="muted" density={density}>{row.venue}</kit.KitText></>}
          </kit.KitText>
        </>}
    </kit.KitContent>
  );
  return (
    <kit.KitRow item={row.id} label={loading ? "" : row.opponent} goto={loading ? undefined : row.goto}
      part={loading ? null : "root"} inline={next} density={density} lineRole={role}>
      {result ? <kit.KitGrid fitLast density={density}>
        {details}
        <kit.KitContent align="center" density={density}>
          {loading ? <kit.KitSkeleton shape="figure" density={density} inset="none"
            content={[["number", result.score, "center", "compact"]]} />
            : <kit.KitText part="score" role="number" numberScale="compact" density={density} tabular>{result.score}</kit.KitText>}
          <kit.KitTrail kind="badge" part="result" tone={result.tone} value={result.label} density={density} />
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
  const rows = next ? input.matches.slice(0, 1) : input.matches;
  return (
    <kit.KitCard part="root" padded={next && state !== "empty"} density={density}>
      {state === "empty" ? <kit.KitEmpty icon="calendar" part="message" decorativeIcon />
        : rows.map((row) => <MatchRow key={row.id} {...{ row, next, density }} loading={state === "loading"} />)}
    </kit.KitCard>
  );
}
