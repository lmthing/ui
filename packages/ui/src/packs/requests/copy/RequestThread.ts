import {
  appointmentDate,
  timeOfDayLine,
  type DeviceData,
  type StateName,
  type Values,
} from "../../../catalog";
import { requestsWordsFor, type RequestsWords } from "../lang";

type Words = RequestsWords["thread"];
type Status = keyof Words["statuses"];
export const threadAudiences = ["requester", "internal"] as const;
export type ThreadAccess = { role: "staff" | "requester"; canReply: boolean };
type Entry = {
  id?: string;
  by: string;
  date: string;
  time: string;
  audience: keyof Words["audiences"];
  kind: "message" | keyof Words["events"];
  from?: Status | undefined;
  to?: Status | undefined;
  who?: string | undefined;
  order?: string | undefined;
  photo?: string | undefined;
  file?: string | undefined;
  fileName?: string | undefined;
  text?: string | undefined;
};

function fileName(data: DeviceData | undefined, ref: unknown) {
  if (typeof ref !== "string") return;
  for (const file of data?.requestFiles ?? []) {
    if (!file || typeof file !== "object") continue;
    const { fileRef, name } = file as { fileRef?: unknown; name?: unknown };
    if (fileRef !== ref || typeof name !== "string") continue;
    const title = name.trim();
    if (title && title.length <= 48 && !/[/\\]/.test(title)) return title;
  }
}

export function threadGates(input: Readonly<Values>, access?: ThreadAccess, data?: DeviceData): Values {
  const choices: readonly string[] = !access?.canReply
    ? []
    : access.role === "staff"
      ? threadAudiences
      : ["requester"];
  const draft = choices.length ? input.draft : undefined;
  const entries = (input.entries as Values[])
    .filter(({ audience }) => access?.role === "staff" || audience === "requester")
    .map((entry) => (entry.file ? { ...entry, fileName: fileName(data, entry.file) } : entry));
  return {
    draft,
    entries,
    audience_choices: choices,
    replyable: choices.length > 0,
    canBrowseReplies: access?.role === "staff" && access.canReply && typeof input.cannedGoto === "string",
    sendable: choices.includes(String(input.audience)) && typeof draft === "string" && Boolean(draft.trim()),
  };
}

export function threadOrder<T extends Entry>(entries: readonly T[]): T[] {
  return [...entries].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
}

export function threadEntryCopy(entry: Entry, detail: "full" | "brief", lang?: string) {
  const { kind, from, to, who, order } = entry;
  const { thread: words } = requestsWordsFor(lang);
  const transition =
    kind === "status" && from && to
      ? words.statusChange(words.statuses[from], words.statuses[to])
      : undefined;
  const event = kind === "message" ? undefined : (detail === "brief" && transition) || words.events[kind];
  const fact = detail === "brief" ? undefined : (transition ?? (who ? words.assignee(who) : order));
  return {
    event,
    fact,
    date: appointmentDate(entry.date, lang),
    time: timeOfDayLine(entry.time, lang),
    audience: words.audiences[entry.audience],
    fileLabel: entry.file ? (entry.fileName ? words.namedFile(entry.fileName) : words.file) : undefined,
  };
}

type Thread = {
  number: string;
  entries: readonly Entry[];
  detail: "full" | "brief";
  draft?: string | undefined;
  audience: Entry["audience"];
  audience_choices?: readonly Entry["audience"][];
  canBrowseReplies?: boolean;
  sendable?: boolean;
};

export function threadRead(input: unknown, state: StateName, lang?: string): string[] {
  const { number, entries, detail, draft, audience, audience_choices, canBrowseReplies, sendable } =
    input as Thread;
  const { thread: words } = requestsWordsFor(lang);
  const visible = state === "empty" ? [] : threadOrder(entries);
  const failedDraft = state === "error" && audience_choices?.includes(audience) ? draft : undefined;
  return [
    words.heading(number),
    ...visible.map((entry) => {
      const { event, fact, date, time, audience, fileLabel } = threadEntryCopy(entry, detail, lang);
      return [
        entry.id,
        event,
        fact,
        state === "error" && entry.text,
        entry.by,
        time,
        date,
        audience,
        entry.photo && words.photo,
        fileLabel,
      ]
        .filter(Boolean)
        .join(" · ");
    }),
    ...(state === "success" ? [words.sent] : []),
    ...(state === "error"
      ? [
          words.failed,
          ...(failedDraft ? [failedDraft, words.audiences[audience]] : []),
          ...(sendable ? [words.retry] : []),
        ]
      : audience_choices?.length
        ? [
            words.audience,
            ...audience_choices.map((choice) => words.audiences[choice]),
            draft || words.field,
            ...(canBrowseReplies && state !== "success" ? [words.canned] : []),
            words.send,
          ]
        : []),
  ];
}
