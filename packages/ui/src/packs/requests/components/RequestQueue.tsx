import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
// prettier-ignore
import { isCompletedRequest, orderedRequests, queueCounts, queueSnapshot, requestLines,
  requestQueueReading, requestStatuses, requestUrgencies, type QueueRecord } from "../copy";
import { requestsWordsFor } from "../lang";

// Core first: List/trail badge cannot switch lifecycle views or order by urgency and deadline.
export const meta = {
  id: "RequestQueue",
  status: "ready",
  group: "data",
  purpose: "Find the next service request to work on by urgency and deadline.",
  pick: "An operator's active and completed service tickets, grouped by lifecycle status and ordered by urgency and deadline. Not a short tappable badge list (List), arbitrary stages (Board), or one rental repair (Request).",
  writeHints: [
    'Write 1–6 records across both views. For one ordered queue without headings, write group "none" and density null. Only set density when spacing is requested.',
    "Never write display order, age, overdue or counts.",
    "Use date and HH:MM for opening; dueAt requires due. Omit both if there is no deadline.",
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "The operator's request records live on the device; sharing changes needs a shared app.",
  variants: { density: ["comfortable", "compact"], group: ["sections", "none"] },
  variantParts: { "group.none": { hides: ["status_heading"] } },
  parts: ["root", "view", "count", "status_heading", "retry", "empty", "error", "more"],
  items: {
    key: "addressed_rows",
    parts: ["root", "number", "title", "place", "status", "urgency", "who", "age", "due"],
    visibleWhen: { inView: true },
  },
  states: ["filled", "empty", "loading", "error"],
  actions: {
    parts: { view: ["select"], retry: ["press"] },
    items: { root: ["press"] },
    when: { root: { inView: true }, retry: { state: "error" } },
  },
  emptyActions: ["view.select"],
  errorActions: ["retry.press"],
  selections: { view: { prop: "view", choices: ["active", "completed"] } },
  deviceData: ["requestQueue"],
  read: readQueue,
} as const satisfies c.Meta;

export const requestStatus = z.enum(requestStatuses);
export const urgency = z.enum(requestUrgencies);
const row = z
  .strictObject({
    number: c.text(12),
    title: c.text(32),
    place: c.text(36).optional(),
    status: requestStatus,
    urgency,
    who: c.text(24).optional(),
    opened: c.isoDate,
    openedAt: c.clock,
    due: c.isoDate.optional(),
    dueAt: c.clock.optional(),
    goto: c.screenId,
  })
  .refine(({ due, dueAt }) => !dueAt || due !== undefined, { path: ["dueAt"] });

// prettier-ignore
export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  rows: z.array(row).min(1).max(6),
  view: z.enum(meta.selections.view.choices).default("active"),
}).overwrite((value) => ({
  ...value,
  // Keep every address slot when switching views.
  addressed_rows: value.rows.map((row) => ({ ...row, inView: isCompletedRequest(row.status) === (value.view === "completed") })),
}));

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast),
    items = c.itemsOf(cast, 3);
  return {
    rows: (items.length ? items : [undefined]).map((item, index) => ({
      number: c.numberLine(index + 1, lang),
      title: (item && c.titleOf(item, 32, thing)) || c.placeholderTitle(index, lang),
      place: (item && c.detailOf(item, 36, thing)) || undefined,
      status: "new",
      urgency: "normal",
      opened: "2026-11-20",
      openedAt: "00:00",
      goto: "details",
    })),
  };
}

// prettier-ignore
export const examples = [
  { rows: [
    { number: "LG-41", title: "Grow light keeps flickering", place: "Fern shelf", status: "working", urgency: "urgent", who: "Noor", opened: "2026-11-18", openedAt: "09:00", due: "2026-11-20", dueAt: "16:00", goto: "grow_light" },
    { number: "LG-42", title: "Leaking mister", status: "new", urgency: "normal", opened: "2026-11-19", openedAt: "10:00", goto: "mister" },
  ] },
  { group: "none", density: "compact", view: "completed", rows: [
    { number: "TR-06", title: "Loose kennel gate", status: "closed", urgency: "low", opened: "2026-11-17", openedAt: "13:30", goto: "kennel_gate" },
    { number: "TR-07", title: "Torn spare lead", status: "resolved", urgency: "urgent", opened: "2026-11-19", openedAt: "11:30", goto: "spare_lead" },
  ] },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("RequestQueue");
export const probes = [
  choose(
    "Give the repair desk one inbox to switch between active and completed tickets, grouped by status and ordered by urgency and promised deadlines",
  ),
  choose(
    "Show my three saved repair shops as ordinary tappable rows, each with a short status badge",
    "List",
  ),
  {
    ...write(
      "Show repair ticket LG-42 Leaking mister, new and normal, opened 2026-11-19 at 10:00; open mister. Put all requests in one ordered queue without section headings.",
    ),
    variant: { axis: "group", value: "none" },
  },
  read(
    "Tap the Grow light keeps flickering report row to open its details. Leave the queue view unchanged.",
    {
      address: "r1/r1",
      action: "press",
    },
  ),
] satisfies c.Probe[];

type QueueProps = c.Props<typeof props, typeof meta>;
type QueueRowProps = QueueRecord & { id: string; goto: string };
function readQueue(input: unknown, state: c.StateName, lang?: string, data?: c.DeviceData): string[] {
  const { view, group } = input as QueueProps;
  const rows = c.visibleItems<QueueRowProps>(meta, input as c.Values);
  return state === "filled" ? requestQueueReading(rows, view, group === "sections", data, lang) : [];
}

// prettier-ignore
function QueueRow({ row, now, density }: { row: QueueRowProps; now: number; density: c.ThemeDensity }) {
  const { lang, words: { queue } } = kit.useWords(requestsWordsFor);
  const line = requestLines(row, now, lang);
  const sub = { role: "caption", tone: "muted", density } as const;
  return <kit.KitRow item={row.id} label={row.title} goto={row.goto} lineRole="heading" density={density}
    trailing={<kit.KitTrail kind="badge" part="urgency" value={line.urgency} tone={row.urgency === "urgent" ? "warn" : "muted"} />}>
    <kit.KitText part="title" role="heading" density={density}>{row.title}</kit.KitText>
    <kit.KitText part={null} {...sub}>
      <kit.KitText part="number" {...sub} tabular>{row.number}</kit.KitText>{queue.separator}
      <kit.KitText part="status" {...sub}>{line.status}</kit.KitText>{queue.separator}
      <kit.KitText part="age" {...sub}>{line.age}</kit.KitText>
    </kit.KitText>
    {row.place && <kit.KitText part="place" {...sub}>{row.place}</kit.KitText>}
    {line.who && <kit.KitText part="who" {...sub}>{line.who}</kit.KitText>}
    {line.due && <kit.KitText part="due" {...sub} tone={line.overdue ? "bad" : "muted"}>{line.due}</kit.KitText>}
  </kit.KitRow>;
}

// prettier-ignore
function QueueRows({ rows, now, density, grouped }: { rows: QueueRowProps[]; now: number; density: c.ThemeDensity; grouped: boolean }) {
  const { words: { queue } } = kit.useWords(requestsWordsFor);
  const ordered = orderedRequests(rows, grouped);
  const draw = (row: QueueRowProps) => <QueueRow key={row.id} {...{ row, now, density }} />;
  if (!grouped) return <>{ordered.map(draw)}</>;
  return <kit.KitCard style="plain" part="status_heading">
    {requestStatuses.map((status) => {
      const group = ordered.filter((row) => row.status === status);
      return group.length > 0 && <kit.KitContent key={status} group="response" density={density}>
        <kit.KitContent inset="md"><kit.KitText part={null} role="label" tone="muted">{queue.status[status]}</kit.KitText></kit.KitContent>
        {group.map(draw)}
      </kit.KitContent>;
    })}
  </kit.KitCard>;
}

// prettier-ignore
export function RequestQueue(input: QueueProps) {
  const state = kit.useComponentState();
  const { lang, words: { queue } } = kit.useWords(requestsWordsFor);
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const grouped = kit.useVariant("group", meta.variants.group, input.group) === "sections";
  const { view } = input, rows = c.visibleItems<QueueRowProps>(meta, input);
  const { more, now } = queueSnapshot(kit.useDeviceData(), view), counts = queueCounts(rows.length, more, lang);
  return <kit.KitCard part="root" density={density} padded inset="none">
    {state === "loading" ? <>
      <kit.KitContent inset="md"><kit.KitSkeleton shape="control" full kind="secondary" label={queue.viewLabel} /></kit.KitContent>
      <kit.KitSkeleton rows={Math.max(1, rows.length)} lead="none" density={density} />
    </> : state === "error" ? <kit.KitContent inset="md" align="center">
      <kit.KitEmpty title={queue.error} part="error" icon="clipboard_list" decorativeIcon />
      <kit.KitAction part="retry" label={queue.retry} kind="secondary" />
    </kit.KitContent> : <>
      <kit.KitContent inset="md">
        <kit.KitTrack look="segments" role="radiogroup" label={queue.viewLabel} part="view">
          {meta.selections.view.choices.map((key) => <kit.KitChip key={key} item={null} role="radio" look="segment" label={queue.views[key]} on={view === key} value={key} />)}
        </kit.KitTrack>
        {state === "filled" && <kit.KitText part="count" role="caption" tone="muted">{counts.count}</kit.KitText>}
      </kit.KitContent>
      {state === "empty" || !rows.length ? <kit.KitEmpty part="empty" icon="clipboard_list" decorativeIcon {...(state === "filled" ? { title: queue.empty[view] } : {})} /> : <QueueRows {...{ rows, now, density, grouped }} />}
      {state === "filled" && counts.more && <kit.KitContent inset="md">
        <kit.KitText part="more" role="caption" tone="muted">{counts.more}</kit.KitText>
      </kit.KitContent>}
    </>}
  </kit.KitCard>;
}
