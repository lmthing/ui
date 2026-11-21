import { z } from "zod";
// prettier-ignore
import { icon, isoDate, itemsOf, placeholderTitle, probesFor, repeatOptions, screenId, text,
  thingOf, titleOf, detailOf, variantProps, type FallbackInput, type Meta, type Probe, type Props } from "../../../catalog";
// prettier-ignore
import { KitAction, KitCard, KitContent, KitEmpty, KitGrid, KitIcon, KitRow, KitText, KitTrack,
  PartContext, useComponentState, usePartContext, useWords } from "../../../kit";
import { careCategories, careCategory, careLines, careReading, careTaskLabel, careToday } from "../copy";
import { homeWordsFor } from "../lang";
// Core first: Checklist/default cannot advance recurring care from the last completion date.
export const meta = {
  id: "CareSchedule",
  status: "ready",
  group: "input",
  purpose: "Keep recurring care for pets, plants, cars or a house and log each completion.",
  pick: "Recurring care with last completion and code-derived next due dates. Not today's one-off jobs (Checklist), shared household points (Chores), a person's medicine (Medication), or provider appointments (Appointment).",
  writeHints: [
    "Write last, repeat and every. Next due, overdue and due-today are computed; never write them. Repeat uses the same enum as Field.",
    "Set category on each task explicitly described as pet, plant, car or house care; otherwise leave category null.",
    'Use arrange "rows" only when asked for one task per line. Keep the repeat, last completion, next due and Done control in either layout; leave surface null unless explicitly requested.',
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  signature: "check_burst",
  realPath: "Care tasks and completion logs stay on the device; notification reminders need permission.",
  variants: { arrange: ["grid", "rows"], surface: ["card", "outlined"] },
  items: {
    key: "tasks",
    parts: ["root", "tile", "title", "for", "icon", "category", "repeat", "last", "next", "done"],
  },
  parts: ["root", "message"],
  states: ["filled", "empty", "success"],
  actions: { items: { done: ["press"], root: ["press"] } },
  read: (input, state, lang): string[] =>
    state === "filled"
      ? careReading((input as { tasks: Parameters<typeof careReading>[0] }).tasks, lang)
      : [],
} as const satisfies Meta;
export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    tasks: z
      .array(
        z.strictObject({
          title: text(24),
          for: text(16).optional(),
          category: z.enum(careCategories).optional(),
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
  .overwrite((value) => ({ ...value, tasks: value.tasks.map((task) => ({ ...task, done: {} })) }));
export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast),
    items = itemsOf(cast, 12);
  return {
    tasks: (items.length ? items : [undefined]).map((item, index) => ({
      title: item
        ? (titleOf(item, 24, thing) ?? placeholderTitle(index, lang))
        : placeholderTitle(index, lang),
      ...(item && detailOf(item, 16, thing) ? { for: detailOf(item, 16, thing) } : {}),
      icon: "check",
      repeat: "weekly",
      every: 1,
      last: "1970-01-01",
      goto: item && screenId.safeParse(item.id).success ? item.id : "detail",
    })),
  };
}
// prettier-ignore
const plantCare = {
    tasks: [
      { title: "Water", for: "Fern", icon: "leaf", repeat: "weekly", every: 1, last: "2026-11-11", goto: "fern" },
      { title: "Feed", for: "Monstera", icon: "leaf", repeat: "weekly", every: 2, last: "2026-11-04", goto: "monstera" },
    ],
} satisfies z.input<typeof props>;
// prettier-ignore
export const examples = [
  plantCare,
  {
    tasks: [
      { title: "Flea treatment", for: "Clover", icon: "heart", repeat: "monthly", every: 1, last: "2026-10-19", goto: "clover" },
    ],
  },
  { ...plantCare, arrange: "rows" },
  { tasks: plantCare.tasks.map((task) => ({ ...task, category: "plant" })) },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("CareSchedule");
export const probes = [
  choose("Water and feed plants on repeats, show last done and next due, and log completion"),
  choose("Tick today's three one-off jobs, no repeats or care history", "Checklist"),
  write(
    "Water the fern weekly, last done 12 November 2026, and feed Monstera every two weeks, last done 5 November 2026, each opens its own details",
  ),
  {
    ...write(
      "Water the fern weekly, last done November 12, and feed Monstera weekly, last done November 14, 2026. Put each care task on a separate full-width row, one below the other.",
    ),
    variant: { axis: "arrange", value: "rows" },
  },
  {
    ...write(
      "One plant-care task: water the fern every week, last done 12 November 2026. Label that task as plant care and link it to fern.",
    ),
    expectProps: { tasks: [{ category: "plant" }] },
  },
  read("Log that I watered the fern", { address: "c1/r1/done", action: "press" }),
] satisfies Probe[];
type CareProps = Props<typeof props, typeof meta>;
type CareTask = CareProps["tasks"][number];
// prettier-ignore
function CareTile({ task, today, wide, surface }: { task: CareTask; today: string; wide: boolean; surface: CareProps["surface"] }) {
  const context = usePartContext();
  const {
    lang,
    words: { careLabels },
  } = useWords(homeWordsFor);
  const copy = careLines(task, today, lang);
  const category = careCategory(task.category, lang);
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
      <KitCard part="tile" padded {...{ surface }}>
        <KitRow
          goto={task.goto}
          part="root"
          label={careTaskLabel(task, lang)}
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
          {category && <KitText role="caption" tone="muted" part="category">{category}</KitText>}
        </KitRow>
        {wide ? <KitGrid fitLast>{summary}</KitGrid> : summary}
      </KitCard>
    </PartContext.Provider>
  );
}
// prettier-ignore
export function CareSchedule({ tasks, arrange, surface }: CareProps) {
  const state = useComponentState();
  const {
    words: { careLabels },
  } = useWords(homeWordsFor);
  if (state === "empty" || state === "success")
    return (
      <KitCard part="root" {...{ surface }}>
        <KitEmpty
          part="message"
          decorativeIcon
          {...(state === "success" ? { icon: "check", title: careLabels.success, tone: "good" } : {})}
        />
      </KitCard>
    );
  const today = careToday();
  const pairs = arrange === "rows" ? 0 : tasks.length - (tasks.length % 2);
  const tiles = tasks.map((task, index) => (
    <CareTile key={task.id} {...{ task, today, surface }} wide={index >= pairs} />
  ));
  if (arrange === "rows")
    return <KitCard style="cards" part="root"><KitGrid arrange={arrange} list listRowGap="cards">{tiles}</KitGrid></KitCard>;
  return (
    <KitTrack>
      {pairs > 0 && <KitGrid columns={2}>{tiles.slice(0, pairs)}</KitGrid>}
      {tiles.slice(pairs)}
    </KitTrack>
  );
}
