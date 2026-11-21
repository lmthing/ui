import type { z } from "zod";
import type { AppCurrency, DeviceData, ScreenLike } from "../agent";
import type { LiveActionInputs, StateName } from "../types";

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
/** Schemas hosts use to supply a pack's trusted records, outside the Writer contract. */
export type HostRecords = Readonly<Record<string, z.ZodType>>;

export type DeviceRows = {
  rows: (data: DeviceData, props: ProjectionProps) => readonly unknown[];
  schema: z.ZodObject;
};

export type ItemMove =
  | ({ column: string; columns: string } & (
      | { derived?: never; capacity?: never }
      // The parsed rows own assignment (null means unassigned); the destination owns the limit.
      | { derived: true; capacity: string }
    ))
  | { field: string; values: readonly string[]; derived?: never };

export type DeviceDataFlags = Readonly<
  Record<string, (data: DeviceData, props: ProjectionProps, now: number) => boolean>
>;

export type DeviceDataWake = (data: DeviceData, props: ProjectionProps, now: number) => number | undefined;

export type ReadSummary = (
  props: unknown,
  state: StateName,
  lang?: string,
  deviceData?: DeviceData,
  currency?: AppCurrency,
) => string[];

export type RecordContext = {
  props: ProjectionProps;
  data: DeviceData;
  journal: readonly unknown[];
  now: number;
  /** The source of initial content for a screen-scoped record. */
  screen?: ScreenLike | undefined;
};
type Operation = { operation?: unknown } | { error: string };
export type RecordRuntime = {
  kind: string;
  /** A prop identifying the record. With no prop, the containing screen identifies it. */
  scope?: string;
  project: (context: RecordContext) => ProjectionProps;
  /** Confirmed component actions, keyed by `part.action`. An absent target hides the action. */
  actions?: Readonly<
    Partial<
      Record<
        `${string}.${string}`,
        {
          target: (props: ProjectionProps) => string | undefined;
          plan: (context: RecordContext) => Operation;
        }
      >
    >
  >;
  presses?: Readonly<
    Record<
      string,
      {
        target: (row: ProjectionProps) => string;
        plan: (context: RecordContext, row: ProjectionProps) => Operation;
      }
    >
  >;
};
