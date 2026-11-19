import { useEffect, useMemo, useState } from "react";
import { components } from "@lmthing/ui/catalog";
import { site } from "../data/site";
import { useStream } from "../create/useStream";
import { cleanScreen, screenOfLines } from "../live/screen";
import { checkLine, type Line } from "../tryit/assemble";

export type Status = "accepted" | "repaired" | "rejected";
export type Chip = { key: number; name: string; status: Status };

/** A recorded Writer reply, one line at a time through the real Validator, as chips and a growing screen. */
export function usePipeline() {
  const recorded = useMemo(() => site.screens.find((s) => s.screen.components.length >= 5), []);
  const lines = useMemo(() => (recorded?.screen.components ?? []).map((c) => JSON.stringify(c)), [recorded]);
  const [round, setRound] = useState(0);
  const shown = useStream(lines.length, "pipeline", round, 1100, true, 0);
  useEffect(() => {
    if (!lines.length || shown < lines.length) return;
    const again = setTimeout(() => setRound((n) => n + 1), 4500);
    return () => clearTimeout(again);
  }, [shown, lines.length]);
  const results = useMemo(() => {
    const taken = new Set<string>();
    const allowed = Object.keys(components);
    return lines.slice(0, shown).map((line, i) => checkLine(line, allowed, i, taken));
  }, [lines, shown]);
  const chips: Chip[] = results.slice(-3).map((r, i) => ({
    key: shown - Math.min(3, results.length) + i,
    name: recorded?.screen.components[shown - Math.min(3, results.length) + i]?.c ?? "",
    status: !r.line ? "rejected" : r.notes.length ? "repaired" : "accepted",
  }));
  const accepted = results.flatMap((r) => (r.line ? [r.line as Line] : []));
  const screen = useMemo(
    () =>
      cleanScreen(
        screenOfLines(
          "pipeline",
          accepted.map((l) => JSON.stringify(l)),
        ),
      ),
    [accepted.length],
  ); // eslint-disable-line react-hooks/exhaustive-deps
  return { recorded, shown, results, chips, screen, total: lines.length };
}
