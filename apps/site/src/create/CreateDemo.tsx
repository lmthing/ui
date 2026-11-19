import { useEffect, useMemo, useRef, useState } from "react";
import { Phone } from "../live/Phone";
import { cleanScreen, screenOfLines } from "../live/screen";
import { JsonLine, type Lit } from "./JsonLine";
import { sources } from "./sources";
import { useStream } from "./useStream";

const phoneWidth = 320;
const phoneHeight = 500;

/** Parts of the address under the pointer on the phone: `screen/component/item/part` -> component and part. */
function litOf(address: string | null): Lit {
  const parts = (address ?? "").split("/");
  return parts.length >= 3 ? { id: parts[1]!, key: parts.at(-1) } : null;
}

/** A model's wire lines stream in and the phone assembles. Hover a key to light its part, and the reverse. */
export default function CreateDemo() {
  const all = useMemo(sources, []);
  const [at, setAt] = useState(0);
  const [run, setRun] = useState(0);
  const [lit, setLit] = useState<Lit>(null);
  const [fresh, setFresh] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const pane = useRef<HTMLPreElement>(null);
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
  const shown = useStream(total, source?.key ?? "", run, 800, visible);
  useEffect(() => {
    if (!total || shown < total) return;
    const next = setTimeout(() => (setAt((a) => (a + 1) % all.length), setRun((n) => n + 1)), 4500);
    return () => clearTimeout(next);
  }, [shown, total, all.length]);
  useEffect(
    () => void pane.current?.scrollTo({ top: pane.current.scrollHeight, behavior: "smooth" }),
    [shown],
  );
  const screen = useMemo(
    () => (source ? cleanScreen(screenOfLines(source.key, source.lines.slice(0, shown))) : null),
    [source, shown],
  );
  const newest = screen?.components.at(-1)?.id;
  // A component that has just been folded in flashes once, so the eye follows each line to its part.
  useEffect(() => {
    if (!newest || !shown) return;
    setFresh(newest);
    const off = setTimeout(() => setFresh(null), 1100);
    return () => clearTimeout(off);
  }, [newest, shown]);
  if (!source || !screen) return null;
  const highlight = lit ? (lit.key ? `${lit.id}/${lit.key}` : lit.id) : (fresh ?? undefined);
  return (
    <div ref={root} className="demo">
      <div className="demo-code">
        <p className="caption">
          <span>{source.origin}</span>
          <span>
            {shown} of {total} lines · hover a key to find its part
          </span>
        </p>
        <pre className="wire-pane" ref={pane} aria-label="Wire lines as they arrive" tabIndex={0}>
          {source.lines.slice(0, shown).map((line, i) => (
            <div key={`${source.key}-${i}`} className="wire-line">
              <JsonLine line={line} lit={lit} onLit={setLit} />
            </div>
          ))}
        </pre>
        <div className="demo-tabs" role="tablist" aria-label="Choose a screen to watch">
          {all.map((s, i) => (
            <button
              key={s.key}
              role="tab"
              aria-selected={i === at}
              onClick={() => (setAt(i), setRun((n) => n + 1))}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <div className="demo-phone">
        {screen.components.length ? (
          <Phone
            screen={screen}
            width={phoneWidth}
            height={phoneHeight}
            fixed
            highlight={highlight}
            onHover={(a) => setLit(litOf(a))}
          />
        ) : (
          <div
            className="phone-skel"
            style={{ width: phoneWidth + 16, height: phoneHeight, maxWidth: "100%" }}
          />
        )}
      </div>
    </div>
  );
}
