import { quote, splitTop } from "./doc-section";
import { arrayShape, count, indexShape, objectShape, requireUnique, type Field, type Shape } from "./shape";
import { enumValues } from "./styles";

const bound = "-?\\d+(?:\\.\\d+)?";
const range = new RegExp(`^(${bound})\\s*[–—-]\\s*(${bound})$`);
const refs = {
  icon: ["icon", '"check"'],
  photo: ["photo", '"lib:item"'],
  media: ["media", '"lib:item"'],
  goto: ["screenId", '"details"'],
  date: ["isoDate", '"2000-01-01"'],
  clock: ["clock", '"00:00"'],
  swatch: ["swatch", '"grey"'],
} as const;

function literalShape({
  values,
  declaredDefault,
}: ReturnType<typeof enumValues>): Shape & { omit?: boolean } {
  if (!values.length || !values.every((value) => typeof value === typeof values[0]))
    throw new Error("Expected a nonempty, homogeneous choice list");
  const ctor = typeof values[0] === "string" ? "enum" : "literal";
  return {
    schema: `z.${ctor}(${quote(values)})${declaredDefault === undefined ? "" : `.default(${quote(declaredDefault)})`}`,
    seed: quote(values[0]),
    omit: declaredDefault !== undefined,
    invalid: [quote("not-a-choice!")],
  };
}

function numeric(type: string): Shape | undefined {
  const prefix = /^(number|integer|int)(?:\s+|$)/.exec(type);
  const limits = type.slice(prefix?.[0].length ?? 0);
  const bounds = range.exec(limits);
  const one = new RegExp(`^(>=|<=|≥|≤|>|<)\\s*(${bound})$`).exec(limits);
  if (!prefix && !bounds) return;
  if (limits && !bounds && !one) throw new Error(`Unsupported numeric bounds: ${type}`);
  const int = prefix ? prefix[1] !== "number" : bounds!.slice(1).every((value) => !value.includes("."));
  if (bounds && Number(bounds[1]) > Number(bounds[2])) throw new Error(`Reversed bounds: ${type}`);
  const op = one
    ? ({ ">": "gt", "<": "lt", ">=": "min", "≥": "min", "<=": "max", "≤": "max" } as const)[
        one[1] as ">" | "<" | ">=" | "≥" | "<=" | "≤"
      ]
    : undefined;
  const point = Number(one?.[2] ?? 0);
  const delta = int ? 1 : 0.5;
  const seed = bounds ? Number(bounds[1]) : point + (op === "gt" ? delta : op === "lt" ? -delta : 0);
  return {
    schema: `z.${int ? "int" : "number"}()${bounds ? `.min(${bounds[1]}).max(${bounds[2]})` : op ? `.${op}(${point})` : ""}`,
    seed: String(seed),
    invalid: bounds
      ? [String(Number(bounds[1]) - delta), String(Number(bounds[2]) + delta)]
      : one
        ? [String(point + (op === "min" ? -delta : op === "max" ? delta : 0))]
        : undefined,
  };
}

function scalar(name: string, type: string, styles: Record<string, string[]>): Shape & { omit?: boolean } {
  const string = /^(text|secret)\(([1-9]\d*)\)$/.exec(type);
  if (string) {
    const [helper, length] = [string[1]!, Number(string[2])];
    return {
      schema: `${helper}(${length})`,
      seed: helper === "secret" ? '""' : `castTitle(${length}, index)`,
      helpers: [helper],
      invalid: [`"x".repeat(${length + 1})`],
    };
  }
  const bool = /^boolean(?:\s+\(default\s+(true|false)\))?$/.exec(type);
  if (bool)
    return {
      schema: `z.boolean()${bool[1] ? `.default(${bool[1]})` : ""}`,
      seed: "false",
      omit: Boolean(bool[1]),
    };
  if (Object.hasOwn(styles, name) && !type) {
    const values = styles[name]!;
    return literalShape({ values, declaredDefault: values[0] });
  }
  if (type === "(mon…sun)")
    return literalShape({
      values: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
      declaredDefault: undefined,
    });
  if (type.startsWith("(") && type.endsWith(")")) {
    const inner = type.slice(1, -1);
    if (inner === "from the `swatch` vocabulary") return scalar(name, "swatch", styles);
    if (/^(?:`[\w-]+`|-?\d+|default\b)(?:[,|\s]|$)/.test(inner)) return literalShape(enumValues(inner));
    return objectShape(readMembers(splitTop(inner, ",;")), "index");
  }
  const known = type.replaceAll("`", "").toLowerCase();
  if (known === "iso datetime with offset")
    return { schema: "z.iso.datetime({ offset: true })", seed: '"2000-01-01T00:00:00Z"' };
  if (known === "iso datetime") return { schema: "z.iso.datetime()", seed: '"2000-01-01T00:00:00Z"' };
  const ref = /^(?:hh:mm|time)$/.test(known)
    ? "clock"
    : known === "yyyy-mm-dd"
      ? "date"
      : !type && /goto$/i.test(name)
        ? "goto"
        : !type && /^(?:from|to|time|breakFrom|breakTo)$/.test(name)
          ? "clock"
          : known || name;
  if (Object.hasOwn(refs, ref)) {
    const [helper, seed] = refs[ref as keyof typeof refs];
    return { schema: helper, helpers: [helper], seed };
  }
  const number = numeric(type);
  if (number) return number;
  throw new Error(`Unsupported field \`${name}\`${type ? ` ${type}` : ""}`);
}

function field(source: string, styles: Record<string, string[]>, prior: Field[]): Field {
  const match = /^(?:`([a-zA-Z][a-zA-Z0-9_]*)`|([a-zA-Z][a-zA-Z0-9_]*))(\??)(?:\s+(.*))?$/.exec(source);
  if (!match) throw new Error(`Unsupported field declaration: ${source}`);
  const name = (match[1] ?? match[2])!;
  let type = (match[4] ?? "")
    .trim()
    .replaceAll("−", "-")
    .replace(/^signed number\b/, "number");
  const defaultValue = /\s+\(default\s+(`?[\w.-]+`?)\)$/.exec(type);
  const numericDefault = defaultValue && /^-?\d+(?:\.\d+)?$/.test(defaultValue[1]!);
  if (numericDefault) type = type.slice(0, defaultValue.index);
  if (!type.startsWith("(") && !/boolean\s+\(default/.test(type)) type = type.replace(/\s+\([^)]*\)$/, "");
  const optional = match[3] === "?" || /(?:^|\s)optional$/.test(type);
  type = type.replace(/(?:^|\s)optional$/, "").trim();
  const repeated =
    /^(.+?)\s+each\s+(.+)$/.exec(type) ??
    /^(exactly\s+\d+|\d+[–-]\d+)\s+(booleans|numbers|photos|integers)$/.exec(type);
  const limit =
    repeated && count.exec(repeated[2]!) ? count.exec(repeated[2]!) : repeated && count.exec(repeated[1]!);
  const item = repeated && limit ? (/each/.test(type) ? repeated[1]! : repeated[2]!.slice(0, -1)) : undefined;
  const shape = item
    ? arrayShape(scalar(name, item, {}), limit!)
    : type === "index"
      ? indexShape(name, prior)
      : scalar(name, type, styles);
  return {
    name,
    ...shape,
    omit: optional || Boolean(numericDefault) || ("omit" in shape && shape.omit === true),
    schema:
      shape.schema + (numericDefault ? `.default(${defaultValue[1]})` : "") + (optional ? ".optional()" : ""),
  };
}

function readMembers(members: string[]) {
  const fields: Field[] = [];
  for (const member of members) fields.push(field(member, {}, fields));
  return fields;
}

function collection(name: string, members: string[], limit: RegExpExecArray): Field {
  return {
    name,
    collection: true,
    ...arrayShape(objectShape(readMembers(members), "index"), limit),
  };
}

export function readFields(writes: string, styles: Record<string, string[]>, axes: Record<string, string[]>) {
  const entries = splitTop(
    (splitTop(writes, ".")[0] ?? "").replace(/\s+and\s+(?=`[a-zA-Z][a-zA-Z0-9_]*`\s)/g, ", "),
    ",;",
  );
  const fields: Field[] = [];
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]!;
    const repeated = /^`([a-zA-Z][a-zA-Z0-9_]*)` of (.+)$/.exec(entry);
    if (repeated) {
      const end = entries.findIndex((candidate, j) => j > i && count.test(candidate));
      if (end < 0) throw new Error(`Collection \`${repeated[1]}\` needs explicit item bounds`);
      fields.push(
        collection(repeated[1]!, [repeated[2]!, ...entries.slice(i + 1, end)], count.exec(entries[end]!)!),
      );
      i = end;
    } else if (!Object.hasOwn(axes, entry.replaceAll("`", ""))) fields.push(field(entry, styles, fields));
  }
  for (const key of Object.keys(styles))
    if (!fields.some(({ name }) => name === key)) fields.push(field(key, styles, fields));
  requireUnique(fields);
  return fields;
}
