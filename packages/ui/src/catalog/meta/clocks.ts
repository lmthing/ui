import type { StateName } from "../types";
import type { DeviceData } from "../agent";

type RecordProps = Readonly<Record<string, unknown>>;

/** A component elapsed clock with explicit Start and Stop appends one wire row on Stop. */
export type ClockCommit = {
  rows: string;
  /** Parsed local week start (a Monday ISO date). */
  week: string;
  /** Host-supplied IANA zone. Omit to use the device's zone. */
  timeZone?: (data: DeviceData) => string | undefined;
  /** Parsed selection fields that must still match the ones captured at Start. */
  selection: readonly string[];
  /** Return no row if the target, time window or host records no longer admit the session. */
  record: (
    session: { start: number; end: number },
    props: RecordProps,
    data: DeviceData,
  ) => RecordProps | undefined;
};

export type ClockTrigger = {
  part: string;
  action: "start" | "stop" | "play" | "pause" | "press" | "toggle" | "check";
  scope?: "component";
  value?: boolean;
  state?: StateName;
};
export type ClockMeta = {
  id: string;
  kind: "up" | "down" | "until";
  /** A local source prop, falling back to the component prop; absent means zero. */
  from?: string;
  prop?: string;
  /** Optional boolean prop that distinguishes a ticking clock from a paused or finished clock. */
  runningProp?: string;
  at?: string;
  /** Cap in whole seconds, or compute it from the parsed holder and component props. */
  max?:
    | number
    | ((holder: Readonly<Record<string, unknown>>, outer: Readonly<Record<string, unknown>>) => number);
  /** Reparse current numeric settings on mounted ticks when computing a duration with max. */
  liveDuration?: true;
  /** An elapsed-time clock can begin again at zero after expiring, without a reset control. */
  restartOnPlay?: true;
  when?: Readonly<Record<string, string | boolean>>;
  /** Without a start trigger the clock starts when the controller is created. */
  start?: ClockTrigger;
  stop?: ClockTrigger;
  reset?: ClockTrigger;
  commitOnStop?: ClockCommit;
  zero?: "stop" | { state: StateName } | { prop: string; value: string | boolean };
};
export type ClockState = {
  running: boolean;
  from: number;
  seconds: number;
  seed?: number;
  /** Active milliseconds below one whole second, retained across playback pauses. */
  remainder?: number;
  /** A replayable clock materialized its expiry, even if its duration is later edited. */
  expired?: true;
  /** Selection bound to the current elapsed session. */
  selection?: string;
};
