import { Json } from "./Json";

export type Lit = { id: string; key?: string | undefined } | null;

type Props = {
  line: string;
  lit?: Lit;
  onLit?: (lit: Lit) => void;
  /** Show only the first rows, then an ellipsis. Rows are cut at a key, never inside a token. */
  max?: number;
};

const none = () => undefined;

/**
 * One wire line, one key per row. A row never wraps: a long value is cut with an ellipsis at the row's end,
 * so a string or key is never broken in the middle. Keys point at the part they draw (hover and focus).
 */
export function JsonLine({ line, lit = null, onLit = none, max }: Props) {
  let entries: [string, unknown][];
  try {
    entries = Object.entries(JSON.parse(line) as Record<string, unknown>);
  } catch {
    return <Json text={line} />;
  }
  const id = String((JSON.parse(line) as { id?: unknown }).id ?? "");
  const shown = max ? entries.slice(0, max) : entries;
  return (
    <span className={`wire ${lit?.id === id ? "hot" : ""}`} onPointerLeave={() => onLit(null)}>
      <span className="row">{"{"}</span>
      {shown.map(([key, value], i) => {
        const point = () => onLit({ id, key: key === "id" || key === "c" ? undefined : key });
        const text = JSON.stringify(value);
        return (
          <span key={key} className="row item" title={text.length > 40 ? text : undefined}>
            <span
              className={`key ${lit?.id === id && lit.key === key ? "on" : ""}`}
              tabIndex={onLit === none ? undefined : 0}
              onPointerEnter={point}
              onFocus={point}
              onBlur={() => onLit(null)}
            >
              <span className="j-k">{`"${key}"`}</span>
            </span>
            : <Json text={text} />
            {i < entries.length - 1 ? "," : ""}
          </span>
        );
      })}
      {shown.length < entries.length && <span className="row item more-rows">…</span>}
      <span className="row">{"}"}</span>
    </span>
  );
}
