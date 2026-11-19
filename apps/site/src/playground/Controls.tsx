import { Segmented } from "./controls/Segmented";
import { Select } from "./controls/Select";
import { Field } from "./SchemaForm";
import type { Node } from "./schema";
import { ThemeBar } from "./ThemeBar";
import type { usePlayground } from "./usePlayground";
import { axesOf, VariantBar } from "./VariantBar";

const widths = ["320", "390", "430"];

type Props = {
  id: string;
  pg: ReturnType<typeof usePlayground>;
  width: number;
  setWidth: (width: number) => void;
};

/** The schema without the variant axes, which have their own segmented controls above it. */
function withoutAxes(schema: Node, axes: string[]): Node {
  const properties = Object.fromEntries(
    Object.entries(schema.properties ?? {}).filter(([k]) => !axes.includes(k)),
  );
  return { ...schema, properties };
}

/** Example, state and width, then theme, variant axes and a control for every other prop in the schema. */
export function Controls({ id, pg, width, setWidth }: Props) {
  const states = (pg.def?.meta.states ?? ["filled"]).map(String);
  const axes = axesOf(pg.def?.meta);
  return (
    <section className="pg-controls" aria-label="Controls">
      <div className="pg-bar">
        <span className="name">example</span>
        <Select
          label="Example"
          value={`example ${pg.example + 1}`}
          options={pg.def!.examples.map((_, i) => `example ${i + 1}`)}
          onChange={(v) => pg.pick(Number(v.replace("example ", "")) - 1)}
        />
        <span className="name">state</span>
        {states.length <= 4 ? (
          <Segmented label="State" value={pg.state} options={states} onChange={pg.setState} wrap />
        ) : (
          <Select label="State" value={pg.state} options={states} onChange={pg.setState} />
        )}
        <span className="name">phone</span>
        <Segmented
          label="Phone width"
          value={String(width)}
          options={widths}
          onChange={(v) => setWidth(Number(v))}
        />
      </div>
      <ThemeBar />
      <div className="vblock">
        <p className="label">variants</p>
        <VariantBar
          meta={pg.def!.meta}
          props={pg.props}
          onChange={(axis, value) => pg.setProps({ ...pg.props, [axis]: value })}
        />
      </div>
      <p className="label">props</p>
      {pg.schema ? (
        <Field
          node={withoutAxes(pg.schema, axes)}
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
