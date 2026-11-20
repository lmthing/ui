import { z } from "zod";
import * as c from "../../../catalog";

// Core first: Ring/default cannot show a group total, a personal contribution and top contributors together.
export const meta = {
  id: "Challenge",
  status: "draft",
  group: "data",
  purpose: "Join a shared goal and track the group’s and your own progress.",
  pick: "A group challenge with a shared goal, deadline, group total, personal contribution and up to three leaders. Not a personal goal (Ring) or a full leaderboard (List).",
  writeHints: [
    "goal must be positive. total, mine and top values are measured in the same unit. top is ordered highest first. Write the ending date; do not write days remaining.",
  ],
  region: "body",
  weight: 2,
  tier: "people",
  realPath: "Members’ entries summed in a shared app.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["top", "rank", "name", "value"] } },
  parts: ["root", "title", "goal", "total", "mine", "ends", "days_left", "top", "join", "log"],
  items: { key: "top", parts: ["root", "rank", "name", "value"], visibleWhen: { detail: "full" } },
  states: ["filled", "success"],
  readSuccess: true,
  successActions: ["join.press", "log.press"],
  actions: {
    parts: { join: ["press"], log: ["press"] },
    when: { join: { joined: false }, log: { joined: true } },
    noGoto: { parts: ["join"] },
  },
  read: (input, _state, lang): string[] => {
    const { total, goal, mine, unit, ends } = input as z.output<typeof props>;
    const withUnit = (n: number) => `${c.numberLine(n, lang)} ${unit}`;
    return [
      `${c.numberLine(total, lang)} ${c.goalLine(goal, lang)} ${unit}`,
      withUnit(mine),
      c.appointmentDate(ends, lang),
    ];
  },
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
  { title: "Root 30 cuttings in November", goal: 30, unit: "plants", total: 18, mine: 4, ends: "2026-11-30", top: [
    { name: "Maya", value: 8 }, { name: "Sam", value: 6 }, { name: "Jo", value: 4 },
  ], joined: true, goto: "log_cuttings" },
  { density: "compact", surface: "outlined", detail: "brief", title: "Walk 100 km together", goal: 100, unit: "km", total: 102.5, mine: 0, ends: "2026-11-30", top: [
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
    "Ring",
  ),
  write(
    "Make a November group goal to root 30 cuttings by 2026-11-30. We have 18 plants together, four from me. I’ve joined; open log_cuttings when I log more.",
  ),
  {
    ...write(
      "Show the club's 100 km walking goal ending 2026-11-30, with 70 km so far and 12 of those mine. Hide the top contributors; keep the group total and my own progress.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Open the screen to log more rooted cuttings.", { address: "c1/log", action: "press" }),
] satisfies c.Probe[];
