import { z } from "zod";
import {
  icon,
  isoDate,
  itemsOf,
  placeholderTitle,
  probesFor,
  repeatOptions,
  screenId,
  text,
  thingOf,
  titleOf,
  detailOf,
  type CastLike,
  type Meta,
  type Probe,
  type Props,
} from "../../../catalog";
import {
  KitAction,
  KitCard,
  KitContent,
  KitEmpty,
  KitGrid,
  KitIcon,
  KitRow,
  KitText,
  KitTrack,
  PartContext,
  useComponentState,
  usePartContext,
} from "../../../kit";
import { careLabels, careLines, careReading, careTaskLabel, careToday } from "../copy";
// Core first: Checklist/default cannot advance recurring care from the last completion date.
export const meta = {
  id: "CareSchedule",
  status: "ready",
  group: "input",
  purpose: "Keep recurring care for pets, plants, cars or a house and log each completion.",
  pick: "Recurring care with last completion and code-derived next due dates. Not today's one-off jobs (Checklist), shared household points (Chores), a person's medicine (Medication), or provider appointments (Appointment).",
  writeHints: [
    "Write last, repeat and every. Next due, overdue and due-today are computed; never write them. Repeat uses the same enum as Field.",
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  signature: "check_burst",
  realPath: "Care tasks and completion logs stay on the device; notification reminders need permission.",
  items: { key: "tasks", parts: ["root", "tile", "title", "for", "icon", "repeat", "last", "next", "done"] },
  parts: ["root", "message"],
  states: ["filled", "empty", "success"],
  actions: { items: { done: ["press"], root: ["press"] } },
  read: (input, state) => (state === "filled" ? careReading((input as z.output<typeof props>).tasks) : []),
} as const satisfies Meta;
export const props = z
  .strictObject({
    tasks: z
      .array(
        z.strictObject({
          title: text(24),
          for: text(16).optional(),
          icon,
          repeat: z.enum(repeatOptions),
          every: z.int().min(1).max(12),
          last: isoDate,
          goto: screenId,
        }),
      )
      .min(1)
      .max(12),
  })
  // Give the completion press its own target so it does not inherit the row's navigation.
  .overwrite(({ tasks }) => ({ tasks: tasks.map((task) => ({ ...task, done: {} })) }));
export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  const thing = thingOf(cast),
    items = itemsOf(cast, 12);
  return {
    tasks: (items.length ? items : [undefined]).map((item, index) => ({
      title: item ? (titleOf(item, 24, thing) ?? placeholderTitle(index)) : placeholderTitle(index),
      ...(item && detailOf(item, 16, thing) ? { for: detailOf(item, 16, thing) } : {}),
      icon: "check",
      repeat: "weekly",
      every: 1,
      last: "1970-01-01",
      goto: item && screenId.safeParse(item.id).success ? item.id : "detail",
    })),
  };
}
export const examples = [
  {
    tasks: [
      {
        title: "Water",
        for: "Fern",
        icon: "leaf",
        repeat: "weekly",
        every: 1,
        last: "2026-11-11",
        goto: "fern",
      },
      {
        title: "Feed",
        for: "Monstera",
        icon: "leaf",
        repeat: "weekly",
        every: 2,
        last: "2026-11-04",
        goto: "monstera",
      },
    ],
  },
  {
    tasks: [
      {
        title: "Flea treatment",
        for: "Clover",
        icon: "heart",
        repeat: "monthly",
        every: 1,
        last: "2026-10-19",
        goto: "clover",
      },
    ],
  },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("CareSchedule");
export const probes = [
  choose("Water and feed plants on repeats, show last done and next due, and log completion"),
  choose("Tick today's three one-off jobs, no repeats or care history", "Checklist"),
  write(
    "Water the fern weekly, last done 12 November 2026, and feed Monstera every two weeks, last done 5 November 2026, each opens its own details",
  ),
  read("Log that I watered the fern", { address: "c1/r1/done", action: "press" }),
] satisfies Probe[];
type CareTask = Props<typeof props, typeof meta>["tasks"][number];
function CareTile({ task, today, wide }: { task: CareTask; today: string; wide: boolean }) {
  const context = usePartContext();
  const copy = careLines(task, today);
  const dates = (
    <KitContent key="dates">
      {(["repeat", "last", "next"] as const).map((part) => (
        <KitText key={part} role="caption" tone={part === "next" ? copy.tone : "muted"} part={part}>
          {copy[part]}
        </KitText>
      ))}
    </KitContent>
  );
  const done = <KitAction key="done" label={careLabels.done} kind="secondary" part="done" action="press" />;
  const summary = [dates, done];
  return (
    <PartContext.Provider value={{ ...context, item: task.id }}>
      <KitCard part="tile" padded>
        <KitRow
          goto={task.goto}
          part="root"
          label={careTaskLabel(task)}
          inline
          lineRole="heading"
          leading={<KitIcon name={task.icon} scale="sm" tone="muted" part="icon" />}
          trailing={<KitIcon name="chevron_right" scale="sm" decorative />}
        >
          <KitText role="heading" part="title">
            {task.title}
          </KitText>
          {task.for && (
            <KitText role="caption" tone="muted" part="for">
              {task.for}
            </KitText>
          )}
        </KitRow>
        {wide ? <KitGrid fitLast>{summary}</KitGrid> : summary}
      </KitCard>
    </PartContext.Provider>
  );
}
export function CareSchedule({ tasks }: Props<typeof props, typeof meta>) {
  const state = useComponentState();
  if (state === "empty" || state === "success")
    return (
      <KitCard part="root">
        <KitEmpty
          part="message"
          decorativeIcon
          {...(state === "success" ? { icon: "check", title: careLabels.success, tone: "good" } : {})}
        />
      </KitCard>
    );
  const today = careToday();
  const pairs = tasks.length - (tasks.length % 2);
  const tiles = tasks.map((task, index) => (
    <CareTile key={task.id} task={task} today={today} wide={index === pairs} />
  ));
  return (
    <KitTrack>
      {pairs > 0 && <KitGrid columns={2}>{tiles.slice(0, pairs)}</KitGrid>}
      {tiles.slice(pairs)}
    </KitTrack>
  );
}
