import { useEffect, useMemo, useRef, useState } from "react";
import { cleanScreen, screenOfLines } from "../live/screen";
import type { Lit } from "../shared/JsonLine";
import { sources } from "./sources";
import { useStream } from "./useStream";

/** Parts of the address under the pointer on the phone: `screen/component/item/part` -> component and part. */
export function litOf(address: string | null): Lit {
  const parts = (address ?? "").split("/");
  return parts.length >= 3 ? { id: parts[1]!, key: parts.at(-1) } : null;
}

const firstFrame = 3;

/** The hero demo's state: which source, how many lines have arrived, and what is lit on either side. */
export function useDemo() {
  const all = useMemo(sources, []);
  const [at, setAt] = useState(0);
  const [run, setRun] = useState(0);
  const [lit, setLit] = useState<Lit>(null);
  const [fresh, setFresh] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const source = all[at];
  const total = source?.lines.length ?? 0;
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const watch = new IntersectionObserver(
      ([e]) => e?.isIntersecting && (setVisible(true), watch.disconnect()),
    );
    watch.observe(node);
    return () => watch.disconnect();
  }, []);
  const shown = useStream(total, source?.key ?? "", run, 800, visible, firstFrame);
  useEffect(() => {
    if (!total || shown < total) return;
    const next = setTimeout(() => (setAt((a) => (a + 1) % all.length), setRun((n) => n + 1)), 4500);
    return () => clearTimeout(next);
  }, [shown, total, all.length]);
  const screen = useMemo(
    () => (source ? cleanScreen(screenOfLines(source.key, source.lines.slice(0, shown))) : null),
    [source, shown],
  );
  const newest = screen?.components.at(-1)?.id;
  // A component that has just been folded in flashes once, so the eye follows each line to its part.
  useEffect(() => {
    if (!newest || shown <= firstFrame) return;
    setFresh(newest);
    const off = setTimeout(() => setFresh(null), 1100);
    return () => clearTimeout(off);
  }, [newest, shown]);
  const highlight = lit ? (lit.key ? `${lit.id}/${lit.key}` : lit.id) : (fresh ?? undefined);
  const pick = (i: number) => (setAt(i), setRun((n) => n + 1));
  return { all, at, pick, source, total, shown, screen, lit, setLit, highlight, root };
}
