import { useState } from "react";
import { blank, plain, type Node } from "./schema";

type Change = (value: unknown) => void;
type FieldProps = { node: Node; value: unknown; onChange: Change; label: string };

function Scalar({ node, value, onChange, label }: FieldProps) {
  if (node.enum) {
    return (
      <select
        aria-label={label}
        value={String(value ?? "")}
        onChange={(e) => onChange(node.enum!.find((o) => String(o) === e.target.value))}
      >
        {node.enum.map((o) => (
          <option key={String(o)}>{String(o)}</option>
        ))}
      </select>
    );
  }
  if (node.type === "boolean")
    return (
      <input
        type="checkbox"
        aria-label={label}
        checked={Boolean(value)}
        onChange={(e) => onChange(e.target.checked)}
      />
    );
  if (node.type === "number" || node.type === "integer") {
    return (
      <input
        type="number"
        aria-label={label}
        value={Number(value ?? 0)}
        min={node.minimum}
        max={node.maximum}
        step={node.type === "integer" ? 1 : "any"}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    );
  }
  if (node.type === "string") {
    const long = (node.maxLength ?? 0) > 80;
    const props = {
      "aria-label": label,
      value: String(value ?? ""),
      maxLength: node.maxLength,
      onChange: (e: { target: { value: string } }) => onChange(e.target.value),
    };
    return long ? <textarea rows={2} {...props} /> : <input type="text" {...props} />;
  }
  return <RawJson label={label} value={value} onChange={onChange} />;
}

function RawJson({ label, value, onChange }: { label: string; value: unknown; onChange: Change }) {
  const [text, setText] = useState(JSON.stringify(value ?? null));
  const [bad, setBad] = useState(false);
  return (
    <input
      type="text"
      aria-label={label}
      aria-invalid={bad}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        try {
          onChange(JSON.parse(e.target.value));
          setBad(false);
        } catch {
          setBad(true);
        }
      }}
    />
  );
}

function List({ node, value, onChange, label }: FieldProps) {
  const items = Array.isArray(value) ? value : [];
  const set = (next: unknown[]) => onChange(next);
  return (
    <div className="list-field">
      {items.map((item, i) => (
        <div key={i} className="item">
          <span className="item-head">
            <b>{i + 1}</b>
            <button
              type="button"
              aria-label={`Remove ${label} ${i + 1}`}
              onClick={() => set(items.filter((_, j) => j !== i))}
            >
              Remove
            </button>
          </span>
          <Field
            node={node.items ?? {}}
            value={item}
            label={`${label} ${i + 1}`}
            onChange={(v) => set(items.map((x, j) => (j === i ? v : x)))}
          />
        </div>
      ))}
      {(node.maxItems === undefined || items.length < node.maxItems) && (
        <button type="button" className="add" onClick={() => set([...items, blank(node.items ?? {})])}>
          Add {label}
        </button>
      )}
    </div>
  );
}

function ObjectFields({ node, value, onChange }: FieldProps) {
  const obj = (value ?? {}) as Record<string, unknown>;
  return (
    <>
      {Object.entries(node.properties ?? {}).map(([key, child]) => {
        const required = node.required?.includes(key);
        const present = key in obj && obj[key] !== undefined;
        return (
          <div key={key} className="row">
            <label className="name">
              {!required && (
                <input
                  type="checkbox"
                  aria-label={`Include ${key}`}
                  checked={present}
                  onChange={(e) => {
                    const next = { ...obj };
                    if (e.target.checked) next[key] = blank(child);
                    else delete next[key];
                    onChange(next);
                  }}
                />
              )}
              {key}
            </label>
            {(required || present) && (
              <Field
                node={child}
                value={obj[key]}
                label={key}
                onChange={(v) => onChange({ ...obj, [key]: v })}
              />
            )}
          </div>
        );
      })}
    </>
  );
}

/** A control for any JSON-schema node: enums, text, numbers, booleans, lists and nested objects. */
export function Field(props: FieldProps) {
  const node = plain(props.node);
  if (node.type === "array") return <List {...props} node={node} />;
  if (node.type === "object" && node.properties)
    return (
      <div className="object">
        <ObjectFields {...props} node={node} />
      </div>
    );
  return <Scalar {...props} node={node} />;
}
