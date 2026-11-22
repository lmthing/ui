import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
// prettier-ignore
import { isCompletedRequest, queueCounts, queueSnapshot, queueVisibility, validSlaTimes,
  requestQueueReading, requestStatuses, requestUrgencies, type QueueRecord } from "../copy";
import { requestsWordsFor } from "../lang";
import { props as slaPolicyProps } from "./SlaPolicy";
import * as rowsView from "./request-queue-rows";
import type { QueueRowProps } from "./request-queue-rows";

// Core first: List/trail badge cannot switch lifecycle views or order by urgency and deadline.
export const meta = {
  id: "RequestQueue",
  status: "ready",
  group: "data",
  purpose: "Find the next service request to work on by urgency and deadline.",
  pick: "An operator's active and completed service tickets, grouped by lifecycle status and ordered by urgency and deadline. Not a short tappable badge list (List), arbitrary stages (Board), or one rental repair (Request).",
  writeHints: [
    'Write 1–6 records across both views, only from the brief. An explicit request for one flat queue with no status headings requires group "none", not null. Only set density when spacing is requested.',
    "Never write display order, age, overdue or counts.",
    "Use date and HH:MM for opening; dueAt requires due. Omit both if there is no deadline.",
    'Use style "mine" only for the current operator’s assigned requests; the host identifies those rows. For a contractual SLA badge, write row.sla with the supplied ISO timestamps (with seconds and offset), including both targets. Never write a breach flag.',
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "The operator's request records live on the device; sharing changes needs a shared app.",
  variants: { density: ["comfortable", "compact"], group: ["sections", "none"] },
  variantParts: { "group.none": { hides: ["status_heading"], adds: ["status"] } },
  parts: ["root", "view", "count", "status_heading", "retry", "empty", "error", "more", "mine"],
  items: {
    key: "addressed_rows",
    parts: ["root", "number", "title", "place", "status", "urgency", "who", "age", "due", "sla_breached"],
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
  previewDeviceData: ({ input }) => ({
    requestQueue: [
      { mine: (input.rows as QueueRecord[]).filter(({ who }) => who).map(({ number }) => number) },
    ],
  }),
  live: { derive: queueVisibility },
  read: readQueue,
} as const satisfies c.Meta;

export const requestStatus = z.enum(requestStatuses);
export const urgency = z.enum(requestUrgencies);
const { openedAt, responseDueAt, respondedAt, resolutionDueAt, resolvedAt, paused } = slaPolicyProps.shape;
const sla = z
  .strictObject({ openedAt, responseDueAt, respondedAt, resolutionDueAt, resolvedAt, paused })
  .refine(validSlaTimes, { path: ["responseDueAt"] });
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
    sla: sla.optional(),
    goto: c.screenId,
  })
  .refine(({ due, dueAt }) => !dueAt || due !== undefined, { path: ["dueAt"] });

// prettier-ignore
export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  rows: z.array(row).min(1).max(6),
  view: z.enum(meta.selections.view.choices).default("active"),
  style: z.literal("mine").optional(),
}).overwrite((value) => ({
  ...value,
  // Keep every address slot when switching views.
  addressed_rows: value.rows.map((row) => ({ ...row, inView: value.style !== "mine" && isCompletedRequest(row.status) === (value.view === "completed") })),
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

const sampleSla = {
  openedAt: "2026-11-18T09:00:00Z",
  responseDueAt: "2026-11-18T12:00:00Z",
  resolutionDueAt: "2026-11-23T16:00:00Z",
};
// prettier-ignore
const standardExamples = [
  { rows: [
    { number: "LG-41", title: "Flickering grow light", place: "Fern shelf", status: "working", urgency: "urgent", who: "Noor", opened: "2026-11-18", openedAt: "09:00", due: "2026-11-20", dueAt: "16:00", goto: "grow_light" },
    { number: "LG-42", title: "Leaking mister", status: "new", urgency: "normal", opened: "2026-11-19", openedAt: "10:00", goto: "mister" },
  ] },
  { view: "completed", rows: [
    { number: "TR-06", title: "Loose kennel gate", status: "closed", urgency: "low", opened: "2026-11-17", openedAt: "13:30", goto: "kennel_gate" },
    { number: "TR-07", title: "Torn spare lead", status: "resolved", urgency: "urgent", opened: "2026-11-19", openedAt: "11:30", goto: "spare_lead" },
  ] },
] satisfies z.input<typeof props>[];
export const examples = [
  ...standardExamples,
  {
    style: "mine",
    rows: [{ ...standardExamples[0]!.rows[0]!, sla: sampleSla }, standardExamples[0]!.rows[1]!],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("RequestQueue");
// prettier-ignore
export const probes = [
  choose("Give the repair desk one inbox to switch between active and completed tickets, grouped by status and ordered by urgency and promised deadlines"),
  choose("Show my three saved repair shops as ordinary tappable rows, each with a short status badge", "List"),
  {
    ...write(
      "Show my service request queue as one flat, ordered list. Do not group by status or show any section headings. The only ticket is LG-42 Leaking mister, new and normal, opened 2026-11-19 at 10:00; tapping it opens mister.",
    ),
    variant: { axis: "group", value: "none" },
  },
  { ...write("Show only the repair tickets assigned to me. Include LG-42 Leaking mister, new and normal, opened 2026-11-19 at 10:00, linking to mister."), expectProps: { style: "mine" } },
  { ...write("For the active queue, LG-41 Flickering grow light is working and urgent, opened 2026-11-18 at 09:00, linking to grow_light. Flag missed contractual service targets from these policy times: opened 2026-11-18T09:00:00Z, first reply due 2026-11-18T12:00:00Z, resolution due 2026-11-23T16:00:00Z. No reply or resolution yet."), expectProps: { rows: [{ sla: sampleSla }] } },
  read("Tap the Flickering grow light report row to open its details. Leave the queue view unchanged.", { address: "r1/r1", action: "press" }),
] satisfies c.Probe[];

type QueueProps = c.Props<typeof props, typeof meta>;
function readQueue(input: unknown, state: c.StateName, lang?: string, data?: c.DeviceData): string[] {
  const { view, group, style } = input as QueueProps;
  const rows = c.visibleItems<QueueRowProps>(meta, input as c.Values);
  return state === "filled"
    ? requestQueueReading(rows, view, group === "sections", data, lang, style === "mine")
    : [];
}

// prettier-ignore
export function RequestQueue(input: QueueProps) {
  const state = kit.useComponentState(), { thing } = kit.usePartContext();
  const { lang, words: { queue } } = kit.useWords(requestsWordsFor);
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const grouped = kit.useVariant("group", meta.variants.group, input.group) === "sections";
  const { view, style } = input, personal = style === "mine";
  const rows = c.visibleItems<QueueRowProps>(meta, kit.useLiveControls(meta, input));
  const { more, now } = queueSnapshot(kit.useDeviceData(), view, personal), counts = queueCounts(rows.length, more, lang);
  const empty = (personal ? queue.mineEmpty : queue.empty)[view];
  return <kit.KitCard part="root" density={density} padded inset="none">
    {state === "loading" ? <>
      <kit.KitContent inset="md">
        {personal && <kit.KitHeader title={{ text: queue.mine, part: "mine" }} density={density} />}
        <kit.KitSkeleton shape="control" full kind="secondary" label={queue.viewLabel} />
        <kit.KitSkeleton shape="figure" inset="none" content={[["caption", counts.count]]} />
      </kit.KitContent>
      {rows.length ? <rowsView.QueueRows {...{ rows, now, density, grouped, personal }} loading /> : <kit.KitSkeleton rows={1} lead="none" density={density} />}
    </> : state === "error" ? <kit.KitContent inset="md" align="center">
      <kit.KitEmpty title={queue.error} part="error" icon="clipboard_list" decorativeIcon />
      <kit.KitAction part="retry" label={queue.retry} kind="secondary" full />
    </kit.KitContent> : <>
      <kit.KitContent inset="md">
        {personal && <kit.KitHeader title={{ text: queue.mine, part: "mine" }} density={density} />}
        <kit.KitTrack look="segments" role="radiogroup" label={queue.viewLabel} part="view">
          {meta.selections.view.choices.map((key) => <kit.KitChip key={key} item={null} role="radio" look="segment" label={queue.views[key]} on={view === key} value={key} />)}
        </kit.KitTrack>
        {state === "filled" && <kit.KitText part="count" role="caption" tone="muted">{counts.count}</kit.KitText>}
      </kit.KitContent>
      {state === "empty" || !rows.length ? <kit.KitEmpty part="empty" icon="clipboard_list" decorativeIcon {...(state === "filled" || !thing || personal ? { title: empty } : {})} /> : <rowsView.QueueRows {...{ rows, now, density, grouped, personal }} />}
      {state === "filled" && counts.more && <kit.KitContent inset="md"><kit.KitText part="more" role="caption" tone="muted">{counts.more}</kit.KitText></kit.KitContent>}
    </>}
  </kit.KitCard>;
}
