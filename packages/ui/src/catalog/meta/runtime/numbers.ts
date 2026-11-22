import type { DeviceData } from "../../agent";

type Props = Readonly<Record<string, unknown>>;

export type NumericLimits = { min?: number; max?: number; step?: number };

export type NumericRange = NumericLimits & {
  /** Intersect with static limits. Return undefined when no local edit is currently valid. */
  bounds?: (holder: Props, props: Props, data: DeviceData) => NumericLimits | undefined;
};
