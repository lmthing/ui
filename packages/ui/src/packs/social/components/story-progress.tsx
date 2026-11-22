import { useLayoutEffect, useRef, useState } from "react";
import { sequenceKey, type SequenceState } from "../../../catalog";
import { KitStepsTrack, useControlValue, useKit, usePartContext } from "../../../kit";

export function StoryProgress({
  count,
  at,
  interval,
  loading,
}: {
  count: number;
  at: number;
  interval: number;
  loading: boolean;
}) {
  const { screen, component } = usePartContext();
  const { interactive } = useKit();
  const address = `${screen}/${component}/${sequenceKey}`;
  const sequence = useControlValue<SequenceState | undefined>(address, undefined);
  const [progress, setProgress] = useState(0);
  const previous = useRef<{ address: string; index: number; since: number } | undefined>(undefined);
  useLayoutEffect(() => {
    const run = previous.current;
    previous.current = undefined;
    if (loading || !interactive) {
      setProgress(0);
      return;
    }
    if (sequence?.since === undefined) {
      // When the shared clock finishes the last slide, it leaves an index with no elapsed time.
      const finished =
        run?.address === address &&
        run.index === count - 1 &&
        sequence?.index === run.index &&
        Date.now() - run.since >= interval;
      setProgress(finished ? 1 : (sequence?.elapsedMs ?? 0) / interval);
      return;
    }
    const { index, since } = sequence;
    previous.current = { address, index, since };
    let frame: number;
    const draw = () => {
      const fraction = Math.max(0, Math.min(1, (Date.now() - since) / interval));
      setProgress(fraction);
      if (fraction < 1) frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, [address, count, interactive, interval, loading, sequence]);
  return (
    <KitStepsTrack
      style="segmented"
      part="progress"
      count={count}
      at={loading ? 0 : at}
      progress={progress}
    />
  );
}
