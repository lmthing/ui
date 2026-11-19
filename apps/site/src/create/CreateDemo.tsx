import { useMemo, useState } from "react";
import { Json } from "../shared/Json";
import { cleanScreen, screenOfLines } from "../live/screen";
import { Phone } from "../live/Phone";
import { sources } from "./sources";
import { useStream } from "./useStream";

/** A model's JSON lines stream in and the phone assembles component by component. Real data, labelled. */
export function CreateDemo({ compact = false }: { compact?: boolean }) {
  const all = useMemo(sources, []);
  const [at, setAt] = useState(0);
  const [run, setRun] = useState(0);
  const source = all[at];
  const total = source?.lines.length ?? 0;
  const shown = useStream(total, source?.key ?? "", run);
  const screen = useMemo(
    () => (source ? cleanScreen(screenOfLines(source.key, source.lines.slice(0, shown))) : null),
    [source, shown],
  );
  if (!source || !screen) return null;
  return (
    <div className={`create ${compact ? "compact" : ""}`}>
      <div className="create-code">
        <div className="tabs" role="tablist" aria-label="Choose a screen to watch">
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
        <p className="origin">
          <span className="chip">{source.origin}</span>
        </p>
        <pre className="code stream" aria-live="polite">
          {source.lines.slice(0, shown).map((line, i) => (
            <div key={`${source.key}-${i}`} className="line-in">
              <Json text={line} />
            </div>
          ))}
          {shown < total && <span className="caret" aria-hidden="true" />}
        </pre>
        <button className="btn" onClick={() => setRun((n) => n + 1)}>
          Replay
        </button>
      </div>
      <Phone
        screen={screen}
        width={compact ? 340 : 390}
        height={compact ? 560 : 620}
        label={`${shown} of ${total} components`}
      />
    </div>
  );
}
