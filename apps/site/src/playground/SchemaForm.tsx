import { useState } from "react";
import { Segmented } from "./controls/Segmented";
import { Select } from "./controls/Select";
import { Switch } from "./controls/Switch";
import { blank, plain, type Node } from "./schema";

type Change = (value: unknown) => void;
type FieldProps = { node: Node; value: unknown; onChange: Change; label: string };

const segmentedMax = 4;

function Scalar({ node, value, onChange, label }: FieldProps) {
  if (node.enum) {
    const options = node.enum.map(String);
    const pick = (v: string) => onChange(node.enum!.find((o) => String(o) === v));
    return options.length <= segmentedMax ? (
      <Segmented label={label} value={String(value ?? "")} options={options} onChange={pick} wrap />
    ) : (
      <Select label={label} value={String(value ?? "")} options={options} onChange={pick} />
    );
  }
  if (node.type === "boolean") return <Switch label={label} on={Boolean(value)} onChange={onChange} />;
  if (node.type === "number" || node.type === "integer") {
    const step = node.type === "integer" ? 1 : "any";
    return (
      <input
        className="in"
        type="number"
        aria-label={label}
        value={Number(value ?? 0)}
        min={node.minimum}
        max={node.maximum}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    );
  }
  if (node.type === "string") {
    const props = {
      "aria-label": label,
      value: String(value ?? ""),
      maxLength: node.maxLength,
      onChange: (e: { target: { value: string } }) => onChange(e.target.value),
    };
    return (node.maxLength ?? 0) > 80 ? (
      <textarea className="in" rows={2} {...props} />
    ) : (
      <input className="in" type="text" {...props} />
    );
  }
  return <RawJson label={label} value={value} onChange={onChange} />;
}

function RawJson({ label, value, onChange }: { label: string; value: unknown; onChange: Change }) {
  const [text, setText] = useState(JSON.stringify(value ?? null));
  const [bad, setBad] = useState(false);
  return (
    <input
      className="in"
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
  return (
    <div className="list-field">
      {items.map((item, i) => (
        <div key={i} className="item">
          <span className="item-head">
            <b>{i + 1}</b>
            <button
              type="button"
              aria-label={`Remove ${label} ${i + 1}`}
              onClick={() => onChange(items.filter((_, j) => j !== i))}
            >
              Remove
            </button>
          </span>
          <Field
            node={node.items ?? {}}
            value={item}
            label={`${label} ${i + 1}`}
            onChange={(v) => onChange(items.map((x, j) => (j === i ? v : x)))}
          />
        </div>
      ))}
      {(node.maxItems === undefined || items.length < node.maxItems) && (
        <button type="button" className="add" onClick={() => onChange([...items, blank(node.items ?? {})])}>
          + Add {label}
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
        const include = (on: boolean) => {
          const next = { ...obj };
          if (on) next[key] = blank(child);
          else delete next[key];
          onChange(next);
        };
        return (
          <div key={key} className="row">
            <span className="name">
              {!required && <Switch label={`Include ${key}`} on={present} onChange={include} />}
              {key}
            </span>
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

/** A control for any JSON-schema node: choices, text, numbers, switches, lists and nested objects. */
export function Field(props: FieldProps) {
  const node = plain(props.node);
  if (node.type === "array") return <List {...props} node={node} />;
  if (node.type === "object" && node.properties) {
    return (
      <div className="object">
        <ObjectFields {...props} node={node} />
      </div>
    );
  }
  return <Scalar {...props} node={node} />;
}
