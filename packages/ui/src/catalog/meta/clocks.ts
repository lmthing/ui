import type { StateName } from "../types";

export type ClockTrigger = {
  part: string;
  action: "start" | "stop" | "press" | "toggle" | "check";
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
  max?: number;
  when?: Readonly<Record<string, string | boolean>>;
  /** Without a start trigger the clock starts when the controller is created. */
  start?: ClockTrigger;
  stop?: ClockTrigger;
  reset?: ClockTrigger;
  zero?: "stop" | { state: StateName } | { prop: string; value: string | boolean };
};
export type ClockState = { running: boolean; from: number; seconds: number; seed?: number };
