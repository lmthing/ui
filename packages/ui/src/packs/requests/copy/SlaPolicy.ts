import { clockLine, documentFieldLine, type ClockMeta, type StateName } from "../../../catalog";
import { requestsWordsFor } from "../lang";

type Targets = {
  openedAt: string;
  responseDueAt: string;
  respondedAt?: string | undefined;
  resolutionDueAt: string;
  resolvedAt?: string | undefined;
};
type LiveTargets = Targets & {
  paused?: boolean;
  responseRemaining?: number;
  resolutionRemaining?: number;
};
type Target = "pending" | "met" | "breached" | "paused";

export function validSlaTimes(input: Targets) {
  const opened = Date.parse(input.openedAt);
  const response = Date.parse(input.responseDueAt);
  const resolution = Date.parse(input.resolutionDueAt);
  const responded = input.respondedAt ? Date.parse(input.respondedAt) : undefined;
  const resolved = input.resolvedAt ? Date.parse(input.resolvedAt) : undefined;
  return (
    opened <= response &&
    response <= resolution &&
    (responded === undefined || opened <= responded) &&
    (resolved === undefined || opened <= resolved) &&
    (responded === undefined || resolved === undefined || responded <= resolved)
  );
}

export const slaClocks = [
  {
    id: "response",
    kind: "until",
    prop: "responseRemaining",
    when: { responseOpen: true },
    timestamp: (_data, holder) => String(holder.responseDueAt),
  },
  {
    id: "resolution",
    kind: "until",
    prop: "resolutionRemaining",
    when: { resolutionOpen: true },
    timestamp: (_data, holder) => String(holder.resolutionDueAt),
  },
] as const satisfies readonly ClockMeta[];

function target(at: string | undefined, due: string, remaining: number, paused: boolean): Target {
  if (at) return Date.parse(at) <= Date.parse(due) ? "met" : "breached";
  if (paused) return "paused";
  return remaining > 0 ? "pending" : "breached";
}

export function slaProgress(input: LiveTargets, now = Date.now()) {
  const { paused = false, responseDueAt, respondedAt, resolutionDueAt, resolvedAt } = input;
  const due = Date.parse(resolutionDueAt);
  const window = due - Date.parse(input.openedAt);
  const remaining = input.resolutionRemaining ?? due - now;
  const response = target(
    respondedAt,
    responseDueAt,
    input.responseRemaining ?? Date.parse(responseDueAt) - now,
    paused,
  );
  const resolution = target(resolvedAt, resolutionDueAt, remaining, paused);
  const breach = response === "breached" || resolution === "breached";
  const state = breach ? "error" : response === "met" && resolution === "met" ? "success" : "filled";
  const ratio =
    resolution === "met"
      ? 1
      : resolution === "paused" || window === 0
        ? 0
        : Math.min(1, Math.max(0, remaining / window));
  return { response, resolution, remaining, ratio, state } as const;
}

export function slaReading(input: LiveTargets, lang?: string) {
  const words = requestsWordsFor(lang).slaPolicy;
  const progress = slaProgress(input);
  const time = clockLine(Math.ceil(Math.max(0, progress.remaining) / 1000), lang);
  const resolution = progress.resolution === "pending" ? words.remaining(time) : words[progress.resolution];
  return { ...progress, words, resolutionText: resolution };
}

export function readSla(raw: unknown, state: StateName, lang?: string) {
  const input = raw as LiveTargets & { requestRef: string; detail: string };
  const { response, resolutionText, state: derived, words } = slaReading(input, lang);
  if (state === "success" && derived !== "success") return [words.success];
  const status =
    state === "success" || derived === "success"
      ? words.success
      : derived === "error"
        ? words.error
        : undefined;
  return [
    ...(status ? [status] : []),
    ...(input.detail === "brief"
      ? []
      : [input.requestRef, documentFieldLine(words.response, words[response], lang)]),
    documentFieldLine(words.resolution, resolutionText, lang),
  ];
}
