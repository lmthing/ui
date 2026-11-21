import type { DeviceData } from "../agent";
import type { LiveActionInputs } from "../types";

export type LiveInputs = Omit<LiveActionInputs, "derive"> & {
  /** Project live props and gates from parsed props and declared host records. Derived items supply stable ids. */
  derive?: (
    props: Readonly<Record<string, unknown>>,
    instance: string,
    deviceData: DeviceData,
  ) => Record<string, unknown>;
};

type LinkedEditState = Readonly<{ swapped: boolean; edit?: Readonly<{ part: string; text: string }> }>;
export type LinkedEdits = {
  inputs: Readonly<Record<string, { prop: string; max: number }>>;
  swap: { part: string; sides: readonly [string, string] };
  /** Project display text and related props from the exact source edit and current order. */
  project: (
    props: Readonly<Record<string, unknown>>,
    state: LinkedEditState,
    data: DeviceData,
  ) => Record<string, unknown>;
};
