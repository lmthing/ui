import type { ClockMeta, ClockSession, ClockState } from "../../../meta";
import type { DeviceData, Values } from "../../index";

export const validTime = (value: number) => Number.isSafeInteger(value) && Math.abs(value) <= 8.64e15;

export function journalOperation(clock: ClockMeta, target: string, action: string): "lap" | undefined {
  return clock.journal?.lap?.part === target && action === "press" ? "lap" : undefined;
}

export function journalStep(
  clock: ClockMeta,
  op: "start" | "lap" | "stop" | "reset",
  state: ClockState | undefined,
  props: Values,
  data: DeviceData,
  now: number,
) {
  const journal = clock.journal!;
  if (!validTime(now) || clock.start?.action !== "start" || clock.stop?.action !== "stop") return;
  const stopped = { running: false, from: now, seconds: 0 };
  if (op === "reset") return state?.running ? { state: stopped } : undefined;
  if (journal.validTarget && !journal.validTarget(props, data)) return;
  const fields = (journal.selection ?? []).map((key) => props[key]);
  if (fields.some((value) => !["string", "number", "boolean"].includes(typeof value))) return;
  const selection = JSON.stringify(fields);
  if (op === "start") {
    if (state?.running) return;
    return { state: { ...stopped, running: true, selection, laps: [] } };
  }
  if (!state?.running || selection !== state.selection || !validTime(state.from) || now <= state.from) return;
  const laps = state.laps ?? [];
  const last = laps.at(-1) ?? state.from;
  if (now < last) return;
  if (op === "lap") {
    const max = journal.lap?.max;
    if (now === last || !Number.isSafeInteger(max) || laps.length >= max!) return;
    return { state: { ...state, laps: [...laps, now] } };
  }
  const durationMs = now - state.from;
  if (!Number.isSafeInteger(durationMs)) return;
  const session: ClockSession = { start: state.from, end: now, durationMs, laps, count: laps.length };
  const row = journal.record(session, props, data);
  if (row) return { state: { ...stopped, seconds: Math.floor(durationMs / 1000) }, row };
}
