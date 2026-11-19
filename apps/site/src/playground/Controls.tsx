import { Field } from "./SchemaForm";
import type { usePlayground } from "./usePlayground";

const widths = [320, 390, 430];

function Variants({ meta }: { meta: Record<string, unknown> }) {
  const v = meta.variants;
  if (!v)
    return <p className="muted">This component declares no shared variant axes yet (planned, step U6a).</p>;
  const axes = Array.isArray(v) ? v.map(String) : Object.keys(v as object);
  return <p className="muted">Shared variant axes: {axes.join(", ")}.</p>;
}

type Props = {
  id: string;
  pg: ReturnType<typeof usePlayground>;
  width: number;
  setWidth: (width: number) => void;
};

/** Example, state and width pickers, then a control for every prop in the component's schema. */
export function Controls({ id, pg, width, setWidth }: Props) {
  const states = pg.def?.meta.states ?? ["filled"];
  return (
    <section className="card pg-controls" aria-label="Controls">
      <div className="pg-bar">
        <label>
          Example{" "}
          <select value={pg.example} onChange={(e) => pg.pick(Number(e.target.value))}>
            {pg.def!.examples.map((_, i) => (
              <option key={i} value={i}>
                Example {i + 1}
              </option>
            ))}
          </select>
        </label>
        <label>
          State{" "}
          <select value={pg.state} onChange={(e) => pg.setState(e.target.value)}>
            {states.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <span className="seg" role="radiogroup" aria-label="Phone width">
          {widths.map((w) => (
            <button key={w} role="radio" aria-checked={w === width} onClick={() => setWidth(w)}>
              {w}
            </button>
          ))}
        </span>
      </div>
      <Variants meta={pg.def!.meta} />
      {pg.schema ? (
        <Field
          node={pg.schema}
          value={pg.props}
          label={id}
          onChange={(v) => pg.setProps(v as Record<string, unknown>)}
        />
      ) : (
        <p className="muted">No controls could be generated for this schema.</p>
      )}
      {pg.issues.length > 0 && (
        <ul className="issues" role="alert">
          {pg.issues.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
