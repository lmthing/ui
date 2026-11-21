import type { z } from "zod";
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

export type SelectionBinding = {
  component: string;
  source?: string;
  check: string;
  all: string;
  requireSelection?: true;
};

type ProjectionProps = Readonly<Record<string, unknown>>;

export type DeviceRows = {
  rows: (data: DeviceData, props: ProjectionProps) => readonly unknown[];
  schema: z.ZodObject;
};

export type DeviceDataFlags = Readonly<
  Record<string, (data: DeviceData, props: ProjectionProps, now: number) => boolean>
>;

export type DeviceDataWake = (data: DeviceData, props: ProjectionProps, now: number) => number | undefined;
