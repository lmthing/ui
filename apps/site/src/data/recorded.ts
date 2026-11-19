import { useEffect, useState } from "react";
import type { RecordedData } from "../../scripts/site-types";

let cache: RecordedData | null = null;
let pending: Promise<RecordedData> | null = null;

/** Recorded model output (screens and read probes) is its own chunk: it is the biggest part of the data. */
export function loadRecorded(): Promise<RecordedData> {
  pending ??= import("../generated/recorded.json").then(
    (m) => (cache = m.default as unknown as RecordedData),
  );
  return pending;
}

/** The recorded data if it has loaded, else empty. Used by code that runs after a component has awaited it. */
export const recordedNow = (): RecordedData => cache ?? { screens: [], readProbes: [] };

/** The recorded data, or null until its chunk has loaded. */
export function useRecorded(): RecordedData | null {
  const [data, setData] = useState<RecordedData | null>(cache);
  useEffect(() => void (data || loadRecorded().then(setData)), [data]);
  return data;
}
