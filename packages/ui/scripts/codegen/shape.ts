export type Shape = {
  schema: string;
  seed: string;
  helpers?: string[];
  invalid?: string[] | undefined;
  array?: { min: number; max: number; hostOverflow: boolean };
  indexOf?: string;
};
export type Field = Shape & { name: string; omit?: boolean; members?: Field[] };

export const count = /^(?:(\d+)\s*[–—-]\s*(\d+)|exactly\s+(\d+))(\s+\(plus host overflow\b.*\))?$/;
const bounds = (limit: RegExpExecArray) =>
  [Number(limit[1] ?? limit[3]), Number(limit[2] ?? limit[3])] as const;

export function arrayShape(child: Shape, limit: RegExpExecArray): Shape {
  const [min, max] = bounds(limit);
  if (min > max || !Number.isSafeInteger(max)) throw new Error("Invalid collection bounds");
  return {
    ...child,
    array: { min, max, hostOverflow: Boolean(limit[4]) },
    schema: `z.array(${child.schema}).min(${min}).max(${max})`,
    seed: `Array.from({ length: ${min} }, (${child.seed.includes("index") ? "_, index" : ""}) => (${child.seed}))`,
    invalid: [
      ...(min ? ["[]"] : []),
      `Array.from({ length: ${max + 1} }, () => (${child.seed.replace(/castTitle\(\d+, index\)/g, '"x"')}))`,
    ],
  };
}

export function indexShape(name: string, siblings: Field[]): Shape {
  const arrays = siblings.filter((field) => field.array);
  const stem = name.replace(/At$/, "");
  const matches = arrays.filter(
    (field) =>
      field.name === stem || field.name === `${stem}s` || (name === "selectedAt" && field.name === "options"),
  );
  const used = new Set(siblings.map((field) => field.indexOf));
  const candidates = matches.length ? matches : arrays.filter((field) => !used.has(field.name));
  const target = candidates.length === 1 ? candidates[0] : undefined;
  if (!target?.array?.max) throw new Error(`Index \`${name}\` needs an unambiguous bounded array`);
  return {
    schema: `z.int().min(0).max(${target.array.max - 1})`,
    seed: "0",
    invalid: ["-1", "0.5", String(target.array.max)],
    indexOf: target.name,
  };
}

export function indexChecks(fields: Field[]) {
  return fields
    .filter(({ indexOf }) => indexOf)
    .map(({ name, indexOf, omit }) => {
      const optionalArray = fields.find((field) => field.name === indexOf)?.omit;
      const length = optionalArray ? `(input.${indexOf}?.length ?? 0)` : `input.${indexOf}.length`;
      const guard = omit ? `input.${name} === undefined || ` : "";
      return `.refine((input) => ${guard}input.${name} < ${length}, { path: [${JSON.stringify(name)}] })`;
    })
    .join("");
}

export function objectShape(children: Field[], index: string): Shape {
  requireUnique(children);
  return {
    schema: `z.strictObject({${children.map((child) => `${child.name}: ${child.schema}`).join(",")}})${indexChecks(children)}`,
    seed: seedObject(children, index),
    helpers: children.flatMap((child) => child.helpers ?? []),
  };
}

export function requireUnique(fields: Field[]) {
  if (new Set(fields.map(({ name }) => name)).size !== fields.length)
    throw new Error("Duplicate schema field");
}

export function seedObject(fields: Field[], index = "index") {
  const requiredTargets = new Set(fields.filter(({ omit }) => !omit).map(({ indexOf }) => indexOf));
  return `{ ${fields
    .filter(({ name, omit }) => !omit || requiredTargets.has(name))
    .map(({ name, seed, array }) => {
      const value = array
        ? array.min === 0 && requiredTargets.has(name)
          ? seed.replace("length: 0", "length: 1")
          : seed
        : seed.replace(/(castTitle\(\d+, )index\b/g, (_, prefix: string) => prefix + index);
      return `${name}: ${value}`;
    })
    .join(", ")} }`;
}
