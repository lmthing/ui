import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { challengeCopy, challengeReading } from "../copy";
import { socialWordsFor } from "../lang";

// Core first: Progress/ring cannot show a group total, a personal contribution and top contributors together.
export const meta = {
  id: "Challenge",
  status: "ready",
  group: "data",
  purpose: "Join a shared goal and track the group’s and your own progress.",
  pick: "A group challenge with a shared goal, deadline, group total, personal contribution and up to three leaders. Not a personal goal (Progress) or a full leaderboard (List).",
  writeHints: [
    "goal must be positive. total, mine and top values are measured in the same unit. top is ordered highest first; use [] when no leaders are given. Write the ending date, not days remaining.",
    'To hide only top contributors, set detail to "brief". Keep any supplied leaders in top. Otherwise use detail: null.',
  ],
  region: "body",
  weight: 2,
  tier: "people",
  realPath: "Members’ entries summed in a shared app.",
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["top", "root", "rank", "name", "value"] } },
  // prettier-ignore
  parts: ["root", "title", "goal", "total", "track", "mine", "ends", "days_left", "top", "join", "join_label", "log", "log_label"],
  items: { key: "top", parts: ["root", "rank", "name", "value"], visibleWhen: { detail: "full" } },
  states: ["filled", "success"],
  readSuccess: true,
  successActions: ["join.press", "log.press"],
  actions: {
    parts: { join: ["press"], log: ["press"] },
    when: { join: { joined: false }, log: { joined: true } },
    noGoto: { parts: ["join"] },
  },
  read: challengeReading,
} as const satisfies c.Meta;

const amount = z.number().min(0).max(999999);
export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  title: c.text(40),
  goal: amount.gt(0),
  unit: c.text(8),
  total: amount,
  mine: amount,
  ends: c.isoDate,
  top: z
    .array(z.strictObject({ name: c.text(20), value: amount }))
    .min(0)
    .max(3),
  joined: z.boolean(),
  goto: c.screenId,
});

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const item = c.itemsOf(cast, 1)[0];
  const values = item ? c.textsOf(item, thing) : [];
  return {
    title: (item && c.titleOf(item, 40, thing)) || c.placeholderTitle(0, lang),
    goal: 1,
    unit: c.clip(c.wordsFor(lang).placeholderLabel, 8),
    total: 0,
    mine: 0,
    ends: values.find((value) => c.isoDate.safeParse(value).success) ?? "1970-01-01",
    top: [],
    joined: false,
    goto: c.screenId.safeParse(item?.id).data ?? "log",
  };
}

// prettier-ignore
export const examples = [
  { title: "Root 30 cuttings in November", goal: 30, unit: "plants", total: 30, mine: 4, ends: "2025-11-30", top: [
    { name: "Maya", value: 8 }, { name: "Sam", value: 6 }, { name: "Jo", value: 4 },
  ], joined: true, goto: "log_cuttings" },
  { title: "Walk 100 km together", goal: 100, unit: "km", total: 72.5, mine: 0, ends: "2026-11-30", top: [
    { name: "Anna", value: 23.5 }, { name: "Ben", value: 20 },
  ], joined: false, goto: "log_walk" },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Challenge");
export const probes = [
  choose(
    "Help our group walk 100 km together. Show the shared total, time left, my own kilometres and three leaders, with a way to log a contribution.",
  ),
  choose(
    "Show just my personal watering goal as a circle that fills up as I finish. No group or other people.",
    "Progress",
  ),
  write(
    "Make a November group goal to root 30 cuttings by 2026-11-30. We have 18 plants together, four from me. I’ve joined; open log_cuttings when I log more.",
  ),
  {
    ...write(
      "Show the club's 100 km walking goal ending 2026-11-30, with 70 km so far and 12 of those mine. I joined; open log_walk to log more. Hide the top contributors; keep the group total and my own progress.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Open the screen to log more rooted cuttings.", { address: "c1/log", action: "press" }),
] satisfies c.Probe[];

type ChallengeProps = c.Props<typeof props, typeof meta>;
type ChallengeText = ReturnType<typeof challengeCopy>;

// prettier-ignore
function ChallengeProgress({ input, words, density }: {
  input: ChallengeProps; words: ChallengeText; density: c.ThemeDensity;
}) {
  return <kit.KitContent group={density === "compact" ? "content" : "response"} density={density}>
    <kit.KitGrid fitLast density={density}>
      <kit.KitText part="total" role="heading" density="comfortable" tabular>{words.total}</kit.KitText>
      <kit.KitText part={null} role="label" tone={words.reached ? "good" : "muted"}>{words.group}</kit.KitText>
    </kit.KitGrid>
    <kit.KitStepsTrack part="track" style="bar" count={1} at={Math.min(1, input.total / input.goal)} />
    <kit.KitText part="goal" role="label" tone="muted">{words.goal}</kit.KitText>
    <kit.KitText part="mine" role="label" tone="muted">{words.mine}</kit.KitText>
  </kit.KitContent>;
}

// prettier-ignore
function ChallengeRankings({ top, words, density, lang }: {
  top: ChallengeProps["top"]; words: ChallengeText; density: c.ThemeDensity; lang: string;
}) {
  if (!words.top) return null;
  return <kit.KitContent group={density === "compact" ? "content" : "response"} density={density}>
    <kit.KitText part="top" role="label" tone="muted" density={density}>{words.top}</kit.KitText>
    <kit.KitGrid arrange="rows" list density={density}>
      {top.map(({ id, name }, index) => {
        const { score, label } = words.leaders[index]!;
        const rank = <kit.KitText part="rank" role="label" tone="muted" tabular>{c.numberLine(index + 1, lang)}</kit.KitText>;
        const value = <kit.KitContent inset="md" density={density}>
          <kit.KitText part="value" role="number" numberScale="compact" density={density} tabular>{score}</kit.KitText>
        </kit.KitContent>;
        return <kit.KitRow key={id} item={id} label={label} leading={rank} trailing={value} inset="none" density={density}>
          <kit.KitText part="name" role="body" density={density} lines={1}>{name}</kit.KitText>
        </kit.KitRow>;
      })}
    </kit.KitGrid>
  </kit.KitContent>;
}

// prettier-ignore
function ChallengeAction({ input, words, density }: {
  input: ChallengeProps; words: ChallengeText; density: c.ThemeDensity;
}) {
  const { controller, interactive } = kit.useKit();
  const part = input.joined ? "log" : "join";
  const label = words.action;
  if (words.ended && (controller || !interactive)) return (
    <kit.KitRow part={part} role="button" inline {...{ label, density }}>
      <kit.KitText part={`${part}_label`} role="label" tone="accent">{label}</kit.KitText>
    </kit.KitRow>
  );
  return <kit.KitAction {...{ part, label }} goto={input.joined ? input.goto : undefined}
    kind={words.ended ? "quiet" : "primary"} full={!words.ended} />;
}

// prettier-ignore
export function Challenge(input: ChallengeProps) {
  const state = kit.useComponentState();
  const density = kit.useKit().density;
  const surface = "card";
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const { lang } = kit.useWords(socialWordsFor);
  const words = challengeCopy({ ...input, detail }, state, lang);
  return <kit.KitCard part="root" padded {...{ density, surface }}>
    <kit.KitContent density={density}>
      <kit.KitText part="title" role="heading" density="comfortable">{input.title}</kit.KitText>
      <kit.KitText part="days_left" role="label" density={density}>{words.daysLeft}</kit.KitText>
      <kit.KitText part="ends" role="label" tone="muted" density={density}>{words.ends}</kit.KitText>
    </kit.KitContent>
    <ChallengeProgress {...{ input, words, density }} />
    <ChallengeRankings top={input.top} {...{ words, density, lang }} />
    <kit.KitContent group="response" density={density}>
      <ChallengeAction {...{ input, words, density }} />
    </kit.KitContent>
  </kit.KitCard>;
}
