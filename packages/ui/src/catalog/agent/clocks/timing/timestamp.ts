import { z } from "zod";
import type { ClockMeta, Meta } from "../../../meta";
import type { DeviceData, Values } from "../../index";
import { validTime } from "./journal";

const offsetDate = z.iso.datetime({ offset: true });

export const hasTimestampClock = (meta: Meta) =>
  [meta.clocks, meta.items?.clocks, meta.items?.nested?.clocks].some((group) =>
    group?.some(({ timestamp }) => timestamp),
  );

export function timestampReading(
  clock: { spec: ClockMeta; holder: Values; outer: Values },
  data: DeviceData,
  now: number,
  max: number,
) {
  const { spec, holder, outer } = clock;
  if (!spec.timestamp || !validTime(now) || (spec.kind !== "until" && spec.kind !== "up")) return;
  const raw = spec.timestamp(data, holder, outer);
  const at = typeof raw === "number" ? raw : offsetDate.safeParse(raw).success ? Date.parse(raw!) : NaN;
  if (!validTime(at)) return;
  if (spec.kind === "until") return { seconds: Math.max(0, at - now), running: now < at };
  if (at > now) return { seconds: 0, running: true };
  const seconds = Math.min(max, Math.floor((now - at) / 1000));
  return { seconds, running: seconds < max };
}
