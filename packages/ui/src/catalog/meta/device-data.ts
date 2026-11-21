import type { z } from "zod";
import type { DeviceData } from "../agent";

type ProjectionProps = Readonly<Record<string, unknown>>;

export type DeviceRows = {
  rows: (data: DeviceData, props: ProjectionProps) => readonly unknown[];
  schema: z.ZodObject;
};

export type DeviceDataFlags = Readonly<
  Record<string, (data: DeviceData, props: ProjectionProps, now: number) => boolean>
>;

export type DeviceDataWake = (data: DeviceData, props: ProjectionProps, now: number) => number | undefined;
