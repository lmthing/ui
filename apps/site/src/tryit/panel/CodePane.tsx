import { JsonLine } from "../../shared/JsonLine";
import type { Written } from "../useTryIt";

/** Each line as it closes, with a badge for what validation repaired or rejected. */
export function CodePane({ written, partial }: { written: Written[]; partial: boolean }) {
  return (
    <pre className="code stream" aria-live="polite">
      {written.map((w, i) => (
        <div key={i} className={`line-in ${w.outcome.line ? "" : "rejected"}`}>
          <JsonLine line={w.raw} />
          {w.outcome.notes.map((note) => (
            <span key={note} className={`badge ${note.startsWith("rejected") ? "bad" : "fixed"}`}>
              {note}
            </span>
          ))}
        </div>
      ))}
      {partial && <span className="caret" aria-hidden="true" />}
      {!written.length && !partial && (
        <span className="muted">The model's lines appear here as they close.</span>
      )}
    </pre>
  );
}
