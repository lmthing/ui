import { Json } from "../shared/Json";

export type Lit = { id: string; key?: string | undefined } | null;

type Props = { line: string; lit: Lit; onLit: (lit: Lit) => void };

/** One wire line with its top-level keys as hover and focus targets that point at the part they draw. */
export function JsonLine({ line, lit, onLit }: Props) {
  let entries: [string, unknown][];
  try {
    entries = Object.entries(JSON.parse(line) as Record<string, unknown>);
  } catch {
    return <Json text={line} />;
  }
  const id = String((JSON.parse(line) as { id?: unknown }).id ?? "");
  return (
    <span className={`wire ${lit?.id === id ? "hot" : ""}`} onPointerLeave={() => onLit(null)}>
      {"{"}
      {entries.map(([key, value], i) => {
        const point = () => onLit({ id, key: key === "id" || key === "c" ? undefined : key });
        return (
          <span key={key}>
            <span
              className={`key ${lit?.id === id && lit.key === key ? "on" : ""}`}
              tabIndex={0}
              onPointerEnter={point}
              onFocus={point}
              onBlur={() => onLit(null)}
            >
              <span className="j-k">{`"${key}"`}</span>
            </span>
            :<Json text={JSON.stringify(value)} />
            {i < entries.length - 1 ? "," : ""}
          </span>
        );
      })}
      {"}"}
    </span>
  );
}
