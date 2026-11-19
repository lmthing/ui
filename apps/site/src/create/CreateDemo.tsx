import { useEffect, useRef } from "react";
import { Phone } from "../live/Phone";
import { JsonLine } from "../shared/JsonLine";
import { litOf, useDemo } from "./useDemo";

const phoneWidth = 320;
const phoneHeight = 500;

/** A model's wire lines stream in and the phone assembles. Hover a key to light its part, and the reverse. */
export default function CreateDemo() {
  const d = useDemo();
  const pane = useRef<HTMLPreElement>(null);
  useEffect(
    () => void pane.current?.scrollTo({ top: pane.current.scrollHeight, behavior: "smooth" }),
    [d.shown],
  );
  if (!d.source || !d.screen) return null;
  return (
    <div ref={d.root} className="demo">
      <div className="demo-code">
        <p className="caption">
          <span>{d.source.origin}</span>
          <span>
            {d.shown} of {d.total} lines · hover a key to find its part
          </span>
        </p>
        <pre className="wire-pane" ref={pane} aria-label="Wire lines as they arrive" tabIndex={0}>
          {d.source.lines.slice(0, d.shown).map((line, i) => (
            <div key={`${d.source!.key}-${i}`} className="wire-line">
              <JsonLine line={line} lit={d.lit} onLit={d.setLit} summary={i < d.shown - 1} />
            </div>
          ))}
        </pre>
        <label className="demo-pick">
          <span>Watch</span>
          <select value={d.at} onChange={(e) => d.pick(Number(e.target.value))}>
            {d.all.map((s, i) => (
              <option key={s.key} value={i}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="demo-phone">
        <Phone
          screen={d.screen}
          width={phoneWidth}
          height={phoneHeight}
          fixed
          highlight={d.highlight}
          onHover={(a) => d.setLit(litOf(a))}
        />
      </div>
    </div>
  );
}
