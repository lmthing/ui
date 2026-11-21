import type { z } from "zod";
import type { DeviceData } from "../agent";

type ProjectionProps = Readonly<Record<string, unknown>>;

export type DeviceRows = {
  rows: (data: DeviceData, props: ProjectionProps) => readonly unknown[];
  schema: z.ZodObject;
};

export type DeviceDataMeta = {
  /** Record kinds this component may read from the host, never from Writer props. */
  deviceData?: readonly string[];
  /** Trusted boolean props for `actions.when`. `now` is epoch milliseconds, not a stored value. */
  deviceDataFlags?: Readonly<
    Record<string, (data: DeviceData, props: ProjectionProps, now: number) => boolean>
  >;
  /** Next future epoch millisecond when a mounted projection needs to be read again. */
  deviceDataWake?: (data: DeviceData, props: ProjectionProps, now: number) => number | undefined;
};
