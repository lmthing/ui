import {
  appointmentDate,
  numberLine,
  pluralForm,
  timeOfDayLine,
  type DeviceData,
  type Values,
} from "../../../catalog";
import { requestsWordsFor } from "../lang";
import { slaProgress } from "./SlaPolicy";

export const requestStatuses = ["new", "queued", "working", "waiting", "resolved", "closed"] as const;
export const requestUrgencies = ["low", "normal", "urgent"] as const;
type Status = (typeof requestStatuses)[number];
type Urgency = (typeof requestUrgencies)[number];
export type QueueView = "active" | "completed";
export type QueueRecord = {
  number: string;
  title: string;
  status: Status;
  urgency: Urgency;
  place?: string | undefined;
  who?: string | undefined;
  opened: string;
  openedAt: string;
  due?: string | undefined;
  dueAt?: string | undefined;
  sla?: Parameters<typeof slaProgress>[0] | undefined;
};

// The host publishes app-local clock time (epoch ms) and omitted counts independently of Writer props.
const previewNow = new Date("2026-11-20T17:00").getTime();
const minuteMs = 60_000;
const minutesPerHour = 60;
const hoursPerDay = 24;
const endOfDay = "23:59:59.999";
export const isCompletedRequest = (status: Status) => status === "resolved" || status === "closed";

type QueueData = { now?: unknown; overflow?: unknown; mine?: unknown; mineOverflow?: unknown };

export function queueSnapshot(data: DeviceData | undefined, view: QueueView, personal = false, live = false) {
  const record = data?.requestQueue?.[0] as QueueData | undefined;
  const { now, overflow, mineOverflow } = record ?? {};
  const count = ((personal ? mineOverflow : overflow) as Partial<Record<QueueView, unknown>>)?.[view];
  return {
    now:
      typeof now === "number" && Number.isFinite(new Date(now).getTime())
        ? now
        : live
          ? Date.now()
          : previewNow,
    more: typeof count === "number" && Number.isSafeInteger(count) && count > 0 ? count : 0,
  };
}

export function queueVisibility(input: Readonly<Values>, _id: string, data: DeviceData): Values {
  const { style, view, addressed_rows } = input as {
    style?: string;
    view: QueueView;
    addressed_rows: (QueueRecord & Values)[];
  };
  const { mine } = (data.requestQueue?.[0] as QueueData | undefined) ?? {};
  const assigned = Array.isArray(mine) ? mine : [];
  return {
    addressed_rows: addressed_rows.map((row) => ({
      ...row,
      inView:
        isCompletedRequest(row.status) === (view === "completed") &&
        (style !== "mine" || assigned.includes(row.number)),
    })),
  };
}

const deadlineKey = ({ due, dueAt }: QueueRecord) => (due ? `${due}T${dueAt ?? endOfDay}` : "\uffff");

export function orderedRequests<T extends QueueRecord>(rows: readonly T[], grouped: boolean): T[] {
  return [...rows].sort(
    (a, b) =>
      (grouped ? requestStatuses.indexOf(a.status) - requestStatuses.indexOf(b.status) : 0) ||
      requestUrgencies.indexOf(b.urgency) - requestUrgencies.indexOf(a.urgency) ||
      deadlineKey(a).localeCompare(deadlineKey(b)),
  );
}

export function requestGroups<T extends QueueRecord>(rows: readonly T[], grouped: boolean) {
  const ordered = orderedRequests(rows, grouped);
  if (!grouped) return [{ status: undefined, rows: ordered }];
  return requestStatuses.flatMap((status) => {
    const rows = ordered.filter((row) => row.status === status);
    return rows.length ? [{ status, rows }] : [];
  });
}

function ageLine(row: QueueRecord, now: number, lang?: string) {
  const words = requestsWordsFor(lang).queue;
  const minutes = Math.floor((now - new Date(`${row.opened}T${row.openedAt}`).getTime()) / minuteMs);
  if (minutes < 1) return words.justOpened;
  const hours = Math.floor(minutes / minutesPerHour);
  const days = Math.floor(hours / hoursPerDay);
  const count = days || hours || minutes;
  return words.age(
    numberLine(count, lang),
    days ? "day" : hours ? "hour" : "minute",
    pluralForm(count, lang),
  );
}

export function requestLines(row: QueueRecord, now: number, lang?: string) {
  const words = requestsWordsFor(lang).queue;
  const overdue = Boolean(
    row.due && !isCompletedRequest(row.status) && now > new Date(deadlineKey(row)).getTime(),
  );
  const date =
    row.due && words.deadline(appointmentDate(row.due, lang), row.dueAt && timeOfDayLine(row.dueAt, lang));
  return {
    status: words.status[row.status],
    urgency: words.urgency[row.urgency],
    who: row.who && words.assignee(row.who),
    age: ageLine(row, now, lang),
    due: date && (overdue ? words.overdue(date) : words.due(date)),
    overdue,
    breach: row.sla && slaProgress(row.sla, now).state === "error" ? words.slaBreached : undefined,
  };
}

export function queueCounts(shown: number, more: number, lang?: string) {
  const words = requestsWordsFor(lang).queue;
  const total = Math.min(shown + more, Number.MAX_SAFE_INTEGER);
  return {
    count: words.count(numberLine(total, lang), pluralForm(total, lang)),
    more: more > 0 ? words.more(numberLine(more, lang)) : undefined,
  };
}

export function requestSkeleton(
  row: QueueRecord,
  lines: ReturnType<typeof requestLines>,
  grouped: boolean,
  compact: boolean,
  lang?: string,
) {
  const { separator } = requestsWordsFor(lang).queue;
  const merge = compact && row.place && lines.who;
  const metadata = {
    number: [row.number, lines.urgency].join(separator),
    age: lines.age,
    status: !grouped && lines.status,
    place: merge ? [row.place, lines.who].join(separator) : row.place,
    who: !merge && lines.who,
    due: lines.due,
    sla_breached: lines.breach,
  };
  return [
    { key: "title", text: row.title, role: "heading" as const, density: "comfortable" as const },
    ...Object.entries(metadata).flatMap(([key, text]) =>
      text ? [{ key, text, role: "caption" as const }] : [],
    ),
  ];
}

export function requestQueueReading(
  rows: readonly (QueueRecord & { id: string })[],
  view: QueueView,
  grouped: boolean,
  data: DeviceData | undefined,
  lang?: string,
  personal = false,
): string[] {
  const words = requestsWordsFor(lang).queue;
  const { more, now } = queueSnapshot(
    data,
    view,
    personal,
    rows.some(({ sla }) => Boolean(sla)),
  );
  const counts = queueCounts(rows.length, more, lang);
  return [
    ...(personal ? [words.mine] : []),
    ...Object.values(words.views),
    counts.count,
    ...(rows.length ? [] : [(personal ? words.mineEmpty : words.empty)[view]]),
    ...requestGroups(rows, grouped).flatMap(({ status, rows }) => [
      ...(status
        ? [
            personal
              ? [words.status[status], numberLine(rows.length, lang)].join(words.separator)
              : words.status[status],
          ]
        : []),
      ...rows.map((row) => {
        const lines = requestLines(row, now, lang);
        return [
          row.id,
          row.number,
          JSON.stringify(row.title),
          !grouped && lines.status,
          lines.urgency,
          row.place,
          lines.who,
          lines.age,
          lines.due,
          lines.breach,
        ]
          .filter(Boolean)
          .join(words.separator);
      }),
    ]),
    ...(counts.more ? [counts.more] : []),
  ];
}
