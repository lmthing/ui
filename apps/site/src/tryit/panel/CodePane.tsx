import { JsonLine, type Lit } from "../../shared/JsonLine";
import type { Written } from "../useTryIt";

type Props = { written: Written[]; partial: boolean; lit: Lit; onLit: (lit: Lit) => void };

/**
 * Each line as it closes, with a badge for what validation repaired or rejected. Finished ops are one summary
 * row; the newest op and the one under the pointer or focus are expanded.
 */
export function CodePane({ written, partial, lit, onLit }: Props) {
  return (
    <pre className="code stream" aria-live="polite">
      {written.map((w, i) => (
        <div key={i} className={`line-in ${w.outcome.line ? "" : "rejected"}`}>
          <JsonLine line={w.raw} lit={lit} onLit={onLit} summary={i < written.length - 1} />
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
