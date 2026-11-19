import { Segmented } from "./controls/Segmented";

type Axes = Record<string, readonly string[]>;
type Meta = { variants?: Axes; items?: { variants?: Axes } };

/** The shared variant vocabulary (implementation plan 4.2a), grouped as the plan groups it. */
const kinds: Record<string, string> = {
  density: "finish",
  emphasis: "finish",
  surface: "finish",
  align: "finish",
  bleed: "finish",
  aspect: "finish",
  detail: "content",
  media: "content",
  figures: "content",
  labels: "content",
  arrange: "collection",
  group: "collection",
  overflow: "collection",
  lead: "collection",
  trail: "collection",
};
const order = ["finish", "content", "collection"];

export const axesOf = (meta: unknown): string[] => Object.keys((meta as Meta).variants ?? {});

type Props = {
  meta: unknown;
  props: Record<string, unknown>;
  onChange: (axis: string, value: string) => void;
};

/** One segmented control per axis the component declares, labelled by kind. Updates as components adopt axes. */
export function VariantBar({ meta, props, onChange }: Props) {
  const axes = (meta as Meta).variants;
  const hasItemAxes = Boolean((meta as Meta).items?.variants);
  if (!axes)
    return (
      <p className="muted">No shared variant axes declared yet (they arrive per component, step U6a).</p>
    );
  const entries = Object.entries(axes);
  return (
    <div className="variants">
      {order.map((kind) => {
        const mine = entries.filter(([axis]) => kinds[axis] === kind);
        return mine.length ? (
          <div key={kind} className="vgroup">
            <p className="label">{kind}</p>
            {mine.map(([axis, values]) => (
              <div key={axis} className="vrow">
                <span className="name">{axis}</span>
                <Segmented
                  label={axis}
                  value={String(props[axis] ?? values[0])}
                  options={values}
                  onChange={(v) => onChange(axis, v)}
                  wrap
                />
              </div>
            ))}
          </div>
        ) : null;
      })}
      {hasItemAxes && <p className="muted">Item axes (tone, mark) are set per item below.</p>}
    </div>
  );
}
