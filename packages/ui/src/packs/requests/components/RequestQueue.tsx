import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import {
  isCompletedRequest,
  queueCounts,
  queueSnapshot,
  queueVisibility,
  requestGroups,
  requestLines,
  requestSkeleton,
  validSlaTimes,
  requestQueueReading,
  requestStatuses,
  requestUrgencies,
  type QueueRecord,
} from "../copy";
import { requestsWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-RequestQueue.generated";
import { props as slaPolicyProps } from "./SlaPolicy";

// Core first: List/trail badge cannot switch lifecycle views or order by urgency and deadline.
export const meta = {
  id: "RequestQueue",
  status: "ready",
  group: "data",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "The operator's request records live on the device; sharing changes needs a shared app.",
  variants: { group: ["sections", "none"] },
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
const standardExamples = [
  {
    rows: [
      {
        number: "LG-41",
        title: "Flickering grow light",
        place: "Fern shelf",
        status: "working",
        urgency: "urgent",
        who: "Noor",
        opened: "2026-11-18",
        openedAt: "09:00",
        due: "2026-11-20",
        dueAt: "16:00",
        goto: "grow_light",
      },
      {
        number: "LG-42",
        title: "Leaking mister",
        status: "new",
        urgency: "normal",
        opened: "2026-11-19",
        openedAt: "10:00",
        goto: "mister",
      },
    ],
  },
  {
    view: "completed",
    rows: [
      {
        number: "TR-06",
        title: "Loose kennel gate",
        status: "closed",
        urgency: "low",
        opened: "2026-11-17",
        openedAt: "13:30",
        goto: "kennel_gate",
      },
      {
        number: "TR-07",
        title: "Torn spare lead",
        status: "resolved",
        urgency: "urgent",
        opened: "2026-11-19",
        openedAt: "11:30",
        goto: "spare_lead",
      },
    ],
  },
] satisfies z.input<typeof props>[];
export const examples = [
  ...standardExamples,
  {
    style: "mine",
    rows: [{ ...standardExamples[0]!.rows[0]!, sla: sampleSla }],
  },
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
      "Show my service request queue as one flat, ordered list. Do not group by status or show any section headings. The only ticket is LG-42 Leaking mister, new and normal, opened 2026-11-19 at 10:00; tapping it opens mister.",
    ),
    variant: { axis: "group", value: "none" },
  },
  {
    ...write(
      "Show only the repair tickets assigned to me. Include LG-42 Leaking mister, new and normal, opened 2026-11-19 at 10:00, linking to mister.",
    ),
    expectProps: { style: "mine" },
  },
  {
    ...write(
      "For the active queue, LG-41 Flickering grow light is working and urgent, opened 2026-11-18 at 09:00, linking to grow_light. Flag missed contractual service targets from these policy times: opened 2026-11-18T09:00:00Z, first reply due 2026-11-18T12:00:00Z, resolution due 2026-11-23T16:00:00Z. No reply or resolution yet.",
    ),
    expectProps: { rows: [{ sla: sampleSla }] },
  },
  read("Tap the Flickering grow light report row to open its details. Leave the queue view unchanged.", {
    address: "r1/r1",
    action: "press",
  }),
] satisfies c.Probe[];

type QueueRowProps = QueueRecord & { id: string; goto: string };

type QueueLine = ReturnType<typeof requestLines>;
type QueueWords = ReturnType<typeof requestsWordsFor>["queue"];
type QueueCaption = { role: "caption"; tone: "muted"; density: c.ThemeDensity };
type QueuePlaceholderOptions = Pick<QueueItemOptions, "grouped" | "density"> & {
  compact: boolean;
  lang: string;
};
function QueuePlaceholder(
  row: QueueRowProps,
  line: QueueLine,
  {
    grouped,
    compact,
    lang,
    density,
    trailing,
  }: QueuePlaceholderOptions & { trailing: ReturnType<typeof kit.KitIcon> },
) {
  return (
    <kit.KitRow
      part={null}
      label={row.title}
      inline
      lineRole="heading"
      density="comfortable"
      trailing={trailing}
    >
      {requestSkeleton(row, line, grouped, compact, lang).map(({ key, ...entry }) => (
        <kit.KitSkeleton key={key} shape="figure" inset="none" density={density} lines={[entry]} />
      ))}
    </kit.KitRow>
  );
}

function QueueAssignment(
  placeText: QueueRowProps["place"],
  whoText: QueueLine["who"],
  sub: QueueCaption,
  compact: boolean,
  separator: string,
) {
  const place = placeText && (
    <kit.KitText part="place" {...sub}>
      {placeText}
    </kit.KitText>
  );
  const who = whoText && (
    <kit.KitText part="who" {...sub}>
      {whoText}
    </kit.KitText>
  );
  return compact && place && who ? (
    <kit.KitText part={null} {...sub}>
      {place}
      {separator}
      {who}
    </kit.KitText>
  ) : (
    <>
      {place}
      {who}
    </>
  );
}

function QueueBreach(breach: string, density: c.ThemeDensity) {
  return (
    <kit.KitRow
      part={null}
      inline
      inset="none"
      label={breach}
      leadingAlign="row"
      leading={<kit.KitTrail kind="badge" part="sla_breached" value={breach} tone="bad" density={density} />}
    >
      {null}
    </kit.KitRow>
  );
}

type QueueItemOptions = { now: number; density: c.ThemeDensity; grouped: boolean; loading: boolean };
function QueueRow({ row, now, density, grouped, loading }: QueueItemOptions & { row: QueueRowProps }) {
  const {
    lang,
    words: { queue },
  } = kit.useWords(requestsWordsFor);
  const line = requestLines(row, now, lang);
  const sub = { role: "caption", tone: "muted", density } as const,
    compact = density === "compact";
  const trailing = <kit.KitIcon name="chevron_right" tone="muted" decorative scale="sm" loading={loading} />;
  if (loading) return QueuePlaceholder(row, line, { grouped, compact, lang, density, trailing });
  return (
    <kit.KitRow
      item={row.id}
      label={row.title}
      goto={row.goto}
      inline
      lineRole="heading"
      density="comfortable"
      trailing={trailing}
    >
      <kit.KitText part="title" role="heading" density="comfortable">
        {row.title}
      </kit.KitText>
      <kit.KitText part={null} {...sub}>
        <kit.KitText part="number" {...sub} tabular>
          {row.number}
        </kit.KitText>
        {queue.separator}
        <kit.KitText part="urgency" {...sub} tone={row.urgency === "urgent" ? "warn" : "muted"}>
          {line.urgency}
        </kit.KitText>
      </kit.KitText>
      <kit.KitText part="age" {...sub}>
        {line.age}
      </kit.KitText>
      {!grouped && (
        <kit.KitText part="status" {...sub}>
          {line.status}
        </kit.KitText>
      )}
      {QueueAssignment(row.place, line.who, sub, compact, queue.separator)}
      {line.due && (
        <kit.KitText part="due" {...sub} tone={line.overdue ? "bad" : "muted"}>
          {line.due}
        </kit.KitText>
      )}
      {line.breach && QueueBreach(line.breach, density)}
    </kit.KitRow>
  );
}

function QueueLanes(
  groupedRows: ReturnType<typeof requestGroups<QueueRowProps>>,
  { now, density, grouped, loading }: QueueItemOptions,
  queue: QueueWords,
  lang: string,
) {
  const lanes = (
    <kit.KitContent inset="md">
      <kit.KitRowGroup spacing="groups" separators={false} density={density}>
        {groupedRows.map(
          ({ status, rows }) =>
            status && (
              <kit.KitRow
                key={status}
                part={null}
                label={queue.status[status]}
                tone="muted"
                density={density}
              >
                <kit.KitContent density={density}>
                  <kit.KitGrid fitLast density={density}>
                    <kit.KitLayoutText line={{ text: queue.status[status], strong: true }} />
                    <kit.KitLayoutText
                      line={{
                        text: c.numberLine(rows.length, lang),
                        role: "figure",
                        compact: true,
                        tabular: true,
                      }}
                      align="end"
                    />
                  </kit.KitGrid>
                  <kit.KitRowGroup separators={false} density={density}>
                    {rows.map((row) => (
                      <QueueRow key={row.id} {...{ row, now, density, grouped, loading }} />
                    ))}
                  </kit.KitRowGroup>
                </kit.KitContent>
              </kit.KitRow>
            ),
        )}
      </kit.KitRowGroup>
    </kit.KitContent>
  );
  return loading ? (
    lanes
  ) : (
    <kit.KitCard style="plain" part="status_heading">
      {lanes}
    </kit.KitCard>
  );
}

function QueueRows({
  rows,
  now,
  density,
  grouped,
  personal,
  loading = false,
}: {
  rows: QueueRowProps[];
  now: number;
  density: c.ThemeDensity;
  grouped: boolean;
  personal: boolean;
  loading?: boolean;
}) {
  const {
    words: { queue },
    lang,
  } = kit.useWords(requestsWordsFor);
  const groupedRows = requestGroups(rows, grouped);
  if (personal && grouped) return QueueLanes(groupedRows, { now, density, grouped, loading }, queue, lang);
  const groups = (
    <kit.KitContent inset="md" group={density === "compact" ? "content" : "response"}>
      <kit.KitGrid arrange="rows" list listRowGap="cards" density={density}>
        {groupedRows.map(({ status, rows }, index) => (
          <kit.KitContent key={status ?? "rows"} group={index ? "response" : "content"}>
            {status &&
              (loading ? (
                <kit.KitSkeleton shape="figure" inset="none" content={[["label", queue.status[status]]]} />
              ) : (
                <kit.KitText part={null} role="label" tone="muted">
                  {queue.status[status]}
                </kit.KitText>
              ))}
            <kit.KitGrid arrange="rows" list listRowGap="cards" density={density}>
              {rows.map((row) => (
                <QueueRow key={row.id} {...{ row, now, density, grouped, loading }} />
              ))}
            </kit.KitGrid>
          </kit.KitContent>
        ))}
      </kit.KitGrid>
    </kit.KitContent>
  );
  return grouped && !loading ? (
    <kit.KitCard style="plain" part="status_heading">
      {groups}
    </kit.KitCard>
  ) : (
    groups
  );
}

type QueueProps = c.Props<typeof props, typeof meta>;
function readQueue(input: unknown, state: c.StateName, lang?: string, data?: c.DeviceData): string[] {
  const { view, group, style } = input as QueueProps;
  const rows = c.visibleItems<QueueRowProps>(meta, input as c.Values);
  return state === "filled"
    ? requestQueueReading(rows, view, group === "sections", data, lang, style === "mine")
    : [];
}

function QueueHeader(
  view: QueueProps["view"],
  personal: boolean,
  density: c.ThemeDensity,
  queue: QueueWords,
  loading: boolean,
  filled: boolean,
  count: string,
) {
  return (
    <kit.KitContent inset="md">
      {personal && <kit.KitHeader title={{ text: queue.mine, part: "mine" }} density={density} />}
      <kit.KitTrack look="segments" role="radiogroup" label={queue.viewLabel} part="view">
        {meta.selections.view.choices.map((key) => (
          <kit.KitChip
            key={key}
            item={null}
            role="radio"
            look="segment"
            label={queue.views[key]}
            on={view === key}
            value={key}
            disabled={loading || undefined}
          />
        ))}
      </kit.KitTrack>
      {(filled || loading) && (
        <kit.KitLayoutText line={{ text: count, part: "count", role: "caption", tone: "muted" }} />
      )}
    </kit.KitContent>
  );
}

export function RequestQueue(input: QueueProps) {
  const state = kit.useComponentState(),
    { thing } = kit.usePartContext();
  const {
    lang,
    words: { queue },
  } = kit.useWords(requestsWordsFor);
  const density = kit.useKit().density;
  const grouped = kit.useVariant("group", meta.variants.group, input.group) === "sections";
  const { view, style } = input,
    personal = style === "mine";
  const rows = c.visibleItems<QueueRowProps>(meta, kit.useLiveControls(meta, input));
  const { more, now } = queueSnapshot(
    kit.useDeviceData(),
    view,
    personal,
    rows.some(({ sla }) => Boolean(sla)),
  );
  const counts = queueCounts(rows.length, more, lang);
  const empty = (personal ? queue.mineEmpty : queue.empty)[view];
  const loading = state === "loading";
  return (
    <kit.KitCard part="root" density={density} padded inset="none">
      {state === "error" ? (
        <kit.KitContent inset="md" align="center">
          <kit.KitEmpty title={queue.error} part="error" icon="clipboard_list" decorativeIcon />
          <kit.KitAction part="retry" label={queue.retry} kind="secondary" full />
        </kit.KitContent>
      ) : (
        <>
          {QueueHeader(view, personal, density, queue, loading, state === "filled", counts.count)}
          {loading && !rows.length ? (
            <kit.KitSkeleton rows={1} lead="none" density={density} />
          ) : state === "empty" || !rows.length ? (
            <kit.KitEmpty
              part="empty"
              icon="clipboard_list"
              decorativeIcon
              {...(state === "filled" || !thing ? { title: empty } : {})}
            />
          ) : (
            <QueueRows {...{ rows, now, density, grouped, personal, loading }} />
          )}
          {state === "filled" && counts.more && (
            <kit.KitContent inset="md">
              <kit.KitText part="more" role="caption" tone="muted">
                {counts.more}
              </kit.KitText>
            </kit.KitContent>
          )}
        </>
      )}
    </kit.KitCard>
  );
}
