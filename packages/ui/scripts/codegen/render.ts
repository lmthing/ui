import { quote } from "./doc-section";
import { seedObject, type Field } from "./shape";
import type { readMeta } from "./metadata";

type Metadata = ReturnType<typeof readMeta>;

function fallback(fields: Field[]) {
  const seed = seedObject(fields, "0");
  const needsText = seed.includes("castTitle(");
  const helpers = needsText ? ["clip", "itemsOf", "placeholderTitle", "thingOf", "titleOf"] : [];
  const members = fields.map(({ seed }) => Number(/length: (\d+)/.exec(seed)?.[1] ?? 1));
  const body = needsText
    ? `
    const thing = thingOf(cast);
    const items = itemsOf(cast, ${Math.max(1, ...members)});
    function castTitle(max: number, index: number) {
      const item = items[index];
      return (item && titleOf(item, max, thing)) || clip(placeholderTitle(index, lang), max);
    }`
    : "";
  const args = needsText ? "{ cast, lang }: FallbackInput" : "_input: FallbackInput";
  return {
    helpers,
    code: `
export function fallback(${args}): z.input<typeof props> {
  ${body}
  return ${seed};
}`,
  };
}

function probeCode(meta: Metadata, near: string | undefined) {
  const root = Object.entries(meta.actions?.parts ?? {})[0];
  const row = Object.entries(meta.actions?.items ?? {})[0];
  const target = root ?? row;
  const address = target
    ? ["c1", ...(root ? [] : ["r1"]), ...(target[0] === "root" ? [] : [target[0]])].join("/")
    : undefined;
  return [
    ...(!meta.codeOwned
      ? [
          'choose("TODO: describe the need this component should win"),',
          `choose("TODO: describe the nearest wrong choice", ${quote(near ?? "TODO")}),`,
          'write("TODO: describe realistic values and intent in the person’s words"),',
        ]
      : []),
    ...(target
      ? [
          `read("TODO: ask for this action in the person’s words", { address: ${quote(address)}, action: ${quote(target[1][0])} }),`,
        ]
      : []),
  ];
}

export function componentSource(
  meta: Metadata,
  fields: Field[],
  catalog: string,
  near: string | undefined,
  pack: boolean,
) {
  const seed = fallback(fields);
  const probes = probeCode(meta, near);
  const helpers = [
    ...new Set([
      ...fields.flatMap(({ helpers }) => helpers ?? []),
      ...seed.helpers,
      ...(meta.variants ? ["variantProps"] : []),
      ...(probes.length ? ["probesFor"] : []),
    ]),
  ].sort();
  const schema = [
    ...(meta.variants ? ["...variantProps(meta.variants),"] : []),
    ...fields.map(({ name, schema }) => `${name}: ${schema},`),
  ];
  const bind = [!meta.codeOwned && "choose", !meta.codeOwned && "write", meta.actions && "read"].filter(
    Boolean,
  );
  return `import { z } from "zod";
import { ${[...helpers, "type FallbackInput", "type Meta", "type Probe", "type Props"].join(", ")} } from ${quote(catalog)};

${pack ? `// Core first: ${meta.pick}\n` : ""}export const meta = ${quote(meta)} as const satisfies Meta;
export const props = z.strictObject({ ${schema.join("\n")} });
${seed.code}

// TODO: Replace the neutral seed with two real examples covering styles and optional fields.
export const examples = [fallback({cast: { things: [], items: [] }})] satisfies z.input<typeof props>[];

// TODO: Replace the probe prompts and verify the fixture address and any action gates.
${bind.length ? `const { ${bind.join(", ")} } = probesFor(${quote(meta.id)});` : ""}
export const probes = [${probes.join("\n")}] satisfies Probe[];

export function ${meta.id}(_input: Props<typeof props, typeof meta>) {
  return null;
}
`;
}

export function testSource(meta: Metadata, fields: Field[], component: string) {
  const invalid = fields.flatMap(({ name, invalid }) =>
    (invalid ?? []).map((value) => `{ ...valid, ${name}: ${value} }`),
  );
  return `import { expect, it } from "vitest";
import { examples, fallback, probes, props } from ${quote(component)};

const cast = { things: [], items: [] };
const valid = props.parse(fallback({ cast }));

it.each(examples)("accepts a draft example", (example) => {
  expect(props.safeParse(example).success).toBe(true);
});

it.each<unknown>([{ ...valid, unknown: "invalid" }, ${invalid.join(",")}])("rejects invalid input", (input) => {
  expect(props.safeParse(input).success).toBe(false);
});

it("validates the fallback for empty and populated casts", () => {
  expect(props.safeParse(fallback({ cast })).success).toBe(true);
  const things = [{ type: "item", fields: ["name"] }];
  const items = [{ id: "one", type: "item", name: "Sample", sample: true }];
  for (const name of ["Sample", 42]) {
    expect(props.safeParse(fallback({ cast: { things, items: items.map((item) => ({ ...item, name })) } })).success).toBe(true);
  }
});

it("declares the draft probe shapes", () => {
  expect(probes.map(({ kind }) => kind)).toEqual(${quote([
    ...(!meta.codeOwned ? ["choose", "choose", "write"] : []),
    ...(meta.actions ? ["read"] : []),
  ])});
});
`;
}

export function labelSources(meta: Metadata) {
  const id = meta.id[0]!.toLowerCase() + meta.id.slice(1);
  const keys = [
    ...new Set([
      ...Object.keys(meta.actions?.parts ?? {}),
      ...Object.keys(meta.actions?.items ?? {}),
      ...(meta.states ?? []).filter((state) => state !== "filled"),
    ]),
  ];
  const labels = Object.fromEntries(["label", ...keys].map((key) => [key, ""]));
  return {
    lang: `// TODO: Supply English labels and add this entry to lang/en.ts.\nexport const ${id}Labels = ${quote(labels)};\n`,
    copy: `export const ${id}Label = <Key extends string>(words: Record<Key, string>, key: Key): string => words[key];\n`,
  };
}
