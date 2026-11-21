import { z } from "zod";
import {
  clockLine,
  numberLine,
  pluralForm,
  timeOfDayLine,
  type DeviceData,
  type StateName,
} from "../../../catalog";
import { teamWordsFor } from "../lang";

type Input = { on: boolean; since?: string | undefined; shift?: string | undefined; detail?: string };
const snapshot = z.strictObject({
  asOf: z.int().nonnegative(),
  dayStart: z.int().nonnegative(),
  events: z.array(
    z.strictObject({
      at: z.int().nonnegative(),
      kind: z.enum(["in", "out", "break_start", "break_end"]),
    }),
  ),
});
type Snapshot = z.input<typeof snapshot>;
const millisPerSecond = 1000;

/** One local worker's ordered events, including any shift that crosses the start of today. */
function clockSummary(data: DeviceData, on: boolean, state: StateName) {
  const parsed = snapshot.safeParse(data.shiftClock?.[0]);
  if (!parsed.success || data.shiftClock?.length !== 1) return;
  const { asOf, dayStart, events } = parsed.data;
  if (dayStart > asOf) return;
  let started: number | undefined;
  let finished: number | undefined;
  let onBreak = false;
  let breaks = 0;
  let last = 0;
  for (const { at, kind } of events) {
    if (at < last || at > asOf) return;
    last = at;
    const active = started !== undefined && finished === undefined;
    if (kind === "in" && !active) {
      started = at;
      finished = undefined;
    } else if (kind === "out" && active) {
      finished = at;
      onBreak = false;
    } else if (kind === "break_start" && active && !onBreak) {
      onBreak = true;
      if (at >= dayStart) breaks++;
    } else if (kind === "break_end" && active && onBreak) onBreak = false;
    else return;
  }
  const active = started !== undefined && finished === undefined;
  if (active !== (state === "filled" && on)) return;
  const elapsed =
    started !== undefined && (active || state === "success")
      ? ((finished ?? asOf) - started) / millisPerSecond
      : undefined;
  return { elapsed, breaks, onBreak };
}

export function timeClockDisplay(
  input: Input,
  state: StateName,
  data: DeviceData,
  lang?: string,
  words = teamWordsFor(lang).timeClock,
) {
  const success = state === "success";
  const summary = clockSummary(data, input.on, state);
  const onBreak = summary?.onBreak ?? false;
  const elapsed = summary?.elapsed;
  return {
    shift: input.shift ?? words.shift,
    status: success ? words.clockedOut : onBreak ? words.onBreak : input.on ? words.on : words.off,
    since:
      !success && input.on && input.since && input.detail !== "brief"
        ? words.since(timeOfDayLine(input.since, lang))
        : undefined,
    elapsed: elapsed === undefined ? undefined : clockLine(elapsed, lang),
    elapsedLabel: elapsed === undefined ? undefined : words.elapsed,
    breaks: summary
      ? words.breaks(numberLine(summary.breaks, lang), pluralForm(summary.breaks, lang))
      : undefined,
    clockAction: success ? undefined : input.on ? words.clockOut : words.clockIn,
    breakAction: !success && input.on ? (onBreak ? words.endBreak : words.startBreak) : undefined,
  };
}

export function timeClockReading(input: unknown, state: StateName, lang?: string, data: DeviceData = {}) {
  const props = input as Input;
  const { shift, ...lines } = timeClockDisplay(props, state, data, lang);
  return [...(!props.shift ? [shift] : []), ...Object.values(lines)].filter(
    (line): line is string => line !== undefined,
  );
}

/** Preview records only; real screens supply their own timestamps via device data. */
export function timeClockPreview({
  input,
  state,
}: {
  input: Readonly<Record<string, unknown>>;
  state: StateName;
}): DeviceData {
  const dayStart = Date.UTC(2026, 10, 20);
  const at = (minutes: number) => dayStart + minutes * 60 * millisPerSecond;
  const events: Snapshot["events"] = [];
  const asOf = at(575);
  if (input.on || state === "success") {
    events.push(
      { at: at(420), kind: "in" },
      { at: at(540), kind: "break_start" },
      { at: at(555), kind: "break_end" },
    );
    if (state === "success") events.push({ at: asOf, kind: "out" });
  }
  return { shiftClock: [{ asOf, dayStart, events } satisfies Snapshot] };
}
