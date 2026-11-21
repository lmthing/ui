import type { DeviceData } from "../agent";

type Props = Readonly<Record<string, unknown>>;
export type RecordContext = {
  props: Props;
  data: DeviceData;
  journal: readonly unknown[];
  now: number;
};
export type RecordRuntime = {
  kind: string;
  scope: string;
  project: (context: RecordContext) => Props;
  presses?: Readonly<
    Record<
      string,
      {
        target: (row: Props) => string;
        plan: (context: RecordContext, row: Props) => { operation?: unknown } | { error: string };
      }
    >
  >;
};
