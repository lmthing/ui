import type { DeviceData } from "../agent";

type Fields = Readonly<Record<string, unknown>>;

export type RecordSnapshot = {
  kind: string;
  keys: readonly string[];
  /** Identify a row in the shared snapshot, with or without an acceptance date. */
  record: (row: Fields, props: Fields) => Fields;
  /** Omit cleared records instead of publishing a record without a date. */
  include: (row: Fields) => boolean;
};

export type RecordEdit = { action: "check"; date: string } | { action: "press"; remove: true };
export type RecordEdits = {
  /** Component fields identifying the collection. Defaults to the clock week, if any. */
  scope?: readonly string[];
  /** Uniquely identifies a wire row, independently of its stamped address. */
  keys: readonly string[];
  parts: Readonly<Record<string, RecordEdit>>;
  revision?: string;
  canRemove?: (row: Fields, props: Fields, data: DeviceData) => boolean;
  /** Host-local ISO date; when omitted, use the device's local calendar date. */
  localDate?: (now: number, data: DeviceData) => string | undefined;
  snapshot?: RecordSnapshot;
};
