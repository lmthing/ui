export type Shape = { schema: string; seed: string; helpers?: string[]; invalid?: string[] | undefined };
export type Field = Shape & { name: string; omit?: boolean; collection?: boolean };

export const count = /^(?:(\d+)\s*[–—-]\s*(\d+)|exactly\s+(\d+))$/;
const bounds = (limit: RegExpExecArray) =>
  [Number(limit[1] ?? limit[3]), Number(limit[2] ?? limit[3])] as const;

export function arrayShape(child: Shape, limit: RegExpExecArray): Shape {
  const [min, max] = bounds(limit);
  if (min > max || !Number.isSafeInteger(max)) throw new Error("Invalid collection bounds");
  return {
    ...child,
    schema: `z.array(${child.schema}).min(${min}).max(${max})`,
    seed: `Array.from({ length: ${min} }, (${child.seed.includes("index") ? "_, index" : ""}) => (${child.seed}))`,
  };
}

export function collectionInvalid(name: string, limit: RegExpExecArray) {
  const [min, max] = bounds(limit);
  return [...(min ? ["[]"] : []), `Array.from({ length: ${max + 1} }, () => valid.${name}?.[0])`];
}

export function objectShape(children: Field[], index: string): Shape {
  requireUnique(children);
  return {
    schema: `z.strictObject({${children.map((child) => `${child.name}: ${child.schema}`).join(",")}})`,
    seed: seedObject(children, index),
    helpers: children.flatMap((child) => child.helpers ?? []),
  };
}

export function requireUnique(fields: Field[]) {
  if (new Set(fields.map(({ name }) => name)).size !== fields.length)
    throw new Error("Duplicate schema field");
}

export function seedObject(fields: Field[], index = "index") {
  return `{ ${fields
    .filter((field) => !field.omit)
    .map(({ name, seed }) => {
      const value = seed.startsWith("Array.from")
        ? seed
        : seed.replace(/(castTitle\(\d+, )index\b/g, (_, prefix: string) => prefix + index);
      return `${name}: ${value}`;
    })
    .join(", ")} }`;
}
