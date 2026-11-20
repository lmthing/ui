import {
  useWords,
  KitCard,
  KitCheck,
  KitEmpty,
  KitIcon,
  KitRow,
  KitText,
  KitWeekMatrix,
  useComponentState,
  useControlValue,
  usePart,
  useVariant,
} from "../../../kit";
import {
  wordsFor,
  icon,
  probesFor,
  streakLine,
  text,
  variantProps,
  type CastLike,
  type Meta,
  type Probe,
  type Props,
} from "../../../catalog";
import { z } from "zod";
import { indexedActions, indexedParts, seedTitles } from "..";
export const meta = {
  id: "HabitGrid",
  status: "ready",
  group: "input",
  purpose: "Keep several healthy habits across the seven days of this week.",
  pick: "Several habits by seven weekdays, an editable check per cell and streak per habit. Not one habit's run of days (Streak), today's jobs only (Checklist), or many weeks of activity (Heatmap).",
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "Habit records stored on the device.",
  writeHints: [
    "Write surface null unless asked for an outline. Do not write the default surface card; use lead none to hide the habit icons without changing the habit names or checks.",
  ],
  variants: { surface: ["card", "outlined"], lead: ["icon", "none"] },
  variantParts: { "lead.none": { hides: ["icon"] } },
  items: { key: "habits", parts: ["root", "name", "icon", "streak", ...indexedParts(7, ["day"])] },
  parts: ["root", "grid"],
  states: ["filled", "empty"],
  actions: {
    items: indexedActions(7, { day: ["check"] }),
    when: Object.fromEntries(
      indexedParts(7, ["day"]).map((part, index) => [part, { [`past_${index + 1}`]: true }]),
    ),
  },
  read: (input, state, lang?: string): string[] => {
    const { weekdayNames } = wordsFor(lang);

    if (state !== "filled") return [];
    const { habits } = input as z.output<typeof props>;
    const today = (new Date().getDay() + 6) % 7;
    return [
      ...weekdayNames,
      ...habits.map((habit) => streakLine(weekStreak(habit.days, today), habit.days, lang)[0]!),
    ];
  },
} as const satisfies Meta;
export const props = z.strictObject({
  ...variantProps(meta.variants),
  habits: z
    .array(
      z
        .strictObject({
          name: text(20),
          icon,
          days: z.array(z.boolean()).min(7).max(7),
        })
        .overwrite((habit) => ({
          ...habit,
          ...Object.fromEntries(
            habit.days.flatMap((done, index) => [
              [`day_${index + 1}`, { done }],
              [`past_${index + 1}`, index <= (new Date().getDay() + 6) % 7],
            ]),
          ),
        })),
    )
    .min(1)
    .max(6),
});
function weekStreak(days: readonly boolean[], today: number): number {
  return days.slice(0, today + (days[today] ? 1 : 0)).reduce((count, done) => (done ? count + 1 : 0), 0);
}
export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  return {
    habits: seedTitles(cast, 2, 20).map((name) => ({
      name,
      icon: "check",
      days: Array.from({ length: 7 }, () => false),
    })),
  };
}
// prettier-ignore
export const examples = [
  {
    habits: [
      { name: "Check Ivy", icon: "leaf", days: [false, true, true, false, false, false, false] },
      { name: "Mist Ivy", icon: "drop", days: [true, true, true, false, false, false, false] },
    ],
  },
  { lead: "none", habits: [{ name: "Walk Pip", icon: "check", days: [true, false, true, false, false, false, false] }] },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("HabitGrid");
export const probes = [
  choose(
    "Show stretch, water and walking down the side of a seven-day grid and tick each day's habit independently",
  ),
  choose(
    "Show how many consecutive days I've kept one walking habit, not several habits in a grid",
    "Streak",
  ),
  write(
    "This week's stretch and water habits, check and drop icons, both only Monday checked, seven Monday-first days",
  ),
  {
    ...write(
      "Show this week's habits in a seven-day grid: stretch and water, both only Monday checked. Keep a check icon for stretch and a drop for water in the data, but show only the names without icons in the habit headings.",
    ),
    variant: { axis: "lead", value: "none" },
  },
  read("Mark Monday's ivy check as done", { address: "h1/r1/day_1", action: "check" }),
] satisfies Probe[];
type Habit = Props<typeof props, typeof meta>["habits"][number];
function HabitStreak({ habit, today }: { habit: Habit; today: number }) {
  const { lang } = useWords();
  const address = usePart("streak").testID.replace(/\/streak$/, "");
  const days = [
    useControlValue(`${address}/day_1`, habit.days[0]!),
    useControlValue(`${address}/day_2`, habit.days[1]!),
    useControlValue(`${address}/day_3`, habit.days[2]!),
    useControlValue(`${address}/day_4`, habit.days[3]!),
    useControlValue(`${address}/day_5`, habit.days[4]!),
    useControlValue(`${address}/day_6`, habit.days[5]!),
    useControlValue(`${address}/day_7`, habit.days[6]!),
  ];
  return (
    <KitText role="number" numberScale="compact" tabular part={null}>
      {streakLine(weekStreak(days, today), days, lang)[0]}
    </KitText>
  );
}
// prettier-ignore
function WeekDays() {
  const { weekdayNames } = useWords().words;
  return weekdayNames.map((label, index) => ({
    id: `day_${index + 1}`,
    label,
    header: <KitText role="caption" tone="muted" part={null}>{label}</KitText>,
  }));
}
// prettier-ignore
export function HabitGrid({ habits, lead, surface }: Props<typeof props, typeof meta>) {
  const state = useComponentState();
  const showIcon = useVariant("lead", meta.variants.lead, lead) === "icon";
  const today = (new Date().getDay() + 6) % 7;
  const days = WeekDays();
  if (state === "empty")
    return <KitCard part="root" surface={surface}><KitEmpty part="grid" decorativeIcon /></KitCard>;
  const rows = habits.map((habit) => ({
    id: habit.id,
    label: habit.name,
    heading: (
      <KitRow item={habit.id} label={habit.name} inline
        leading={showIcon && <KitIcon name={habit.icon} part="icon" />}>
        <KitText role="body" part="name" lines={2}>{habit.name}</KitText>
      </KitRow>
    ),
    cells: days.map((day, index) => ({
      id: day.id,
      content: (
        <KitCheck part={day.id} label={day.label} done={habit.days[index]!} disabled={index > today} />
      ),
    })),
  }));
  return (
    <KitCard part="root" surface={surface}>
      <KitWeekMatrix
        part="grid" {...{ days, rows }} corner={null} today={days[today]!.id}
        trailing={habits.map((habit) => ({
          row: habit.id,
          content: (
            <KitRow item={habit.id} label={habit.name} inline part="streak">
              <HabitStreak habit={habit} today={today} />
            </KitRow>
          ),
        }))}
      />
    </KitCard>
  );
}
