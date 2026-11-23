import { dataExports, scanEntries } from "./scan-entries";
import { generateDoors } from "./generate-doors";
import { publishEntries } from "./publish-entries";
import { promptModule } from "./prompt-source";
import { iconTable } from "../../../src/catalog/icons";

export type Entries = Awaited<ReturnType<typeof scanEntries>>;

export function componentLines(defs: Entries["defs"]) {
  return [
    "// prettier-ignore",
    "export const components = {",
    ...defs.map(
      ({ name }) => `  ${name}: { ${dataExports.map((key) => `${key}: ${name}.${key}`).join(", ")} },`,
    ),
    "} satisfies Record<string, Definition>;",
  ];
}

function rendererEntry(defs: Entries["defs"]) {
  const ready = defs.filter(({ draft }) => !draft);
  return [
    ...ready.map(({ name, path }) => `import { ${name} } from "${path}";`),
    "export const renderers = {",
    ...ready.map(({ name }) => `  ${name},`),
    "};",
  ];
}

function componentEntry(defs: Entries["defs"]) {
  return [
    `import type { Definition } from "../catalog";`,
    ...defs.map(({ name, path }) => `import * as ${name} from "${path}";`),
    ...componentLines(defs),
  ];
}

function catalogLines() {
  return [
    "import { registryOf, packReady as packReadyOf, buildPackIndex as packIndexOf, " +
      'type RegistryOptions, type PackId } from "../catalog";',
    `import { components as coreComponents } from "./core";`,
    `import { components as surfaceComponents } from "./surfaces";`,
    "import { components as packComponents, packOf, packs, packArchetypes, packArchetypeOverrides, " +
      'packComposeProbes, packExamples } from "./packs";',
    `export * from "../catalog";`,
    `export { packOf, packs, packArchetypes, packArchetypeOverrides, packComposeProbes, packExamples };`,
    // Keep declaration emit from expanding each component schema at the catalog boundary.
    "export const components: typeof coreComponents & typeof packComponents & typeof surfaceComponents = " +
      "{ ...coreComponents, ...packComponents, ...surfaceComponents };",
    "export type ComponentName = keyof typeof components;",
    "export function packReady(id: PackId) {",
    "  return packReadyOf(id, { components, packOf, packs, packExamples });",
    "}",
    "export function createRegistry(options: RegistryOptions = {}): ReturnType<typeof registryOf<typeof components>> {",
    "  return registryOf(components, options, packOf, packReady, packArchetypes, packArchetypeOverrides);",
    "}",
    "export function buildPackIndex(options: { includeDrafts?: boolean } = {}) {",
    "  return packIndexOf(packs, options, packReady);",
    "}",
  ];
}

const maps = [
  "components",
  "packOf",
  "packs",
  "packArchetypes",
  "packArchetypeOverrides",
  "packComposeProbes",
  "packExamples",
] as const;
const packsPerGroup = 9;

export function packRendererPath(index: number, id: string) {
  return `pack-views/group-${Math.floor(index / packsPerGroup) + 1}/${id}.ts`;
}

function aggregateLines(names: string[], keys: readonly string[] = maps) {
  const bindings = names.map((name) => name.replaceAll("-", ""));
  // Preserve the exact keys and schemas without re-emitting them at each pack aggregation.
  const componentType = bindings.map((name) => `typeof ${name}.components`).join(" & ");
  return [
    ...names.map((name, i) => `import * as ${bindings[i]} from "./${name}";`),
    ...keys.flatMap((key) => [
      `export const ${key}${key === "components" && componentType ? `: ${componentType}` : ""} = {`,
      ...bindings.map((name) => `  ...${name}.${key},`),
      "};",
    ]),
  ];
}

function rendererLines(group: Entries["packs"], defs: Entries["defs"]) {
  const ids = new Set(group.map(({ id }) => id));
  const ready = defs.filter(({ pack, draft }) => pack && ids.has(pack) && !draft);
  return [
    ...group
      .filter(({ id }) => ready.some(({ pack }) => pack === id))
      .map(({ id }) => `import * as ${id} from "../../packs/${id}";`),
    "export const renderers = {",
    ...ready.map(({ name, pack }) => `  ${name}: ${pack}.${name}.${name},`),
    "};",
  ];
}

function packRendererEntry(id: string, defs: Entries["defs"]) {
  const ready = defs.filter(({ pack, draft }) => pack === id && !draft);
  return [
    ...(ready.length ? [`import * as pack from "../../../packs/${id}";`] : []),
    "export const renderers = {",
    ...ready.map(({ name }) => `  ${name}: pack.${name}.${name},`),
    "};",
  ];
}

function packLines(pack: Entries["packs"][number], defs: Entries["defs"]) {
  const { id, meta, archetypes, overrides, composeProbes, example } = pack;
  const imports = [
    ...defs.map(({ name }) => name),
    ...(meta ? ["pack as packMeta"] : []),
    ...archetypes.map(({ name }, i) => `${name} as archetype${i}`),
    ...(overrides ? ["archetypeOverrides"] : []),
    ...composeProbes.map((name, i) => `${name} as composeProbes${i}`),
    ...(example !== undefined ? ["example"] : []),
  ];
  const layouts =
    meta || archetypes.length ? `${id}: [${archetypes.map((_, i) => `archetype${i}`).join(", ")}]` : "";
  const layoutOverrides = overrides ? `${id}: archetypeOverrides` : "";
  const probes = composeProbes.length
    ? `${id}: [${composeProbes.map((_, i) => `...composeProbes${i}`).join(", ")}]`
    : "";
  return [
    `import type { Definition, PackId, PackMeta, ArchetypeMeta, ArchetypeOverrides, ComposeProbe } from "../../../catalog";`,
    ...(imports.length ? [`import { ${imports.join(", ")} } from "../../../packs/${id}";`] : []),
    ...componentLines(defs),
    "export const packOf = {",
    ...defs.map(({ name }) => `  ${name}: "${id}",`),
    "} satisfies Partial<Record<keyof typeof components, PackId>>;",
    `export const packs = { ${meta ? `${id}: packMeta` : ""} } satisfies Partial<Record<PackId, PackMeta>>;`,
    `export const packArchetypes = { ${layouts} } satisfies Partial<Record<PackId, readonly ArchetypeMeta[]>>;`,
    `export const packArchetypeOverrides = { ${layoutOverrides} } ` +
      "satisfies Partial<Record<PackId, ArchetypeOverrides>>;",
    `export const packComposeProbes = { ${probes} } satisfies Partial<Record<PackId, readonly ComposeProbe[]>>;`,
    `export const packExamples = { ${example !== undefined ? `${id}: example` : ""} } satisfies Partial<Record<PackId, string>>;`,
  ];
}

function generatePackEntries({ defs, packs }: Entries): Record<string, string[]> {
  const outputs: Record<string, string[]> = {};
  const groups: string[] = [];
  for (let start = 0; start < packs.length; start += packsPerGroup) {
    const name = `group-${groups.length + 1}`;
    groups.push(name);
    const group = packs.slice(start, start + packsPerGroup);
    for (const pack of group)
      outputs[`packs/${name}/${pack.id}.ts`] = packLines(
        pack,
        defs.filter(({ pack: id }) => id === pack.id),
      );
    outputs[`packs/${name}/index.ts`] = aggregateLines(group.map(({ id }) => id));
    outputs[`packs/${name}/README.md`] = [
      "# generated pack group",
      "",
      "Generated by `pnpm build:entries`. Do not edit.",
      "Each pack file imports its root door; `index.ts` combines the data maps.",
    ];
    group.forEach(({ id }, offset) => {
      outputs[packRendererPath(start + offset, id)] = packRendererEntry(id, defs);
    });
    outputs[`views/${name}.ts`] = rendererLines(group, defs);
  }
  outputs["packs/index.ts"] = aggregateLines(groups);
  outputs["packs/README.md"] = [
    "# generated packs",
    "",
    "Generated by `pnpm build:entries`. Do not edit.",
    "Groups contain at most nine pack files and a door.",
    "`index.ts` combines component data, membership, metadata, archetypes, overrides, compose probes and examples.",
  ];
  outputs["views/index.ts"] = aggregateLines(groups, ["renderers"]);
  outputs["pack-views/README.md"] = [
    "# generated pack renderer entries",
    "",
    "Generated by `pnpm build:entries`. Do not edit.",
    "Each leaf collects only its own pack's ready renderers.",
  ];
  outputs["views/README.md"] = [
    "# generated pack views",
    "",
    "Generated by `pnpm build:entries`. Do not edit.",
    "Each group imports up to nine pack root doors and collects only ready renderers.",
    "`index.ts` combines groups without exposing renderer references to catalog declarations.",
  ];
  return outputs;
}

export async function generateEntries(root: string) {
  const entries = await scanEntries(root);
  const icons = [...new Set(Object.values(iconTable))].sort().join(", ");
  const core = entries.defs.filter(({ pack, path }) => !pack && !path.includes("/surfaces/"));
  const surfaces = entries.defs.filter(({ path }) => path.includes("/surfaces/"));
  const outputs = {
    ...Object.fromEntries(
      entries.defs.flatMap(({ name, prompt }) =>
        prompt
          ? [[`${promptModule(name)}.ts`, [`export const prompt = ${JSON.stringify(prompt)} as const;`]]]
          : [],
      ),
    ),
    ...generatePackEntries(entries),
    "icons.generated.ts": [
      "// prettier-ignore",
      `import { ${icons} } from "@tamagui/lucide-icons";`,
      "// prettier-ignore",
      `export { ${icons} };`,
    ],
    "core.ts": componentEntry(core),
    "core-renderers.ts": rendererEntry(core),
    "surfaces.ts": componentEntry(surfaces),
    "surface-renderers.ts": rendererEntry(surfaces),
    "catalog.ts": catalogLines(),
    "renderers.ts": [
      `import { renderers as coreRenderers } from "./core-renderers";`,
      `import { renderers as packRenderers } from "./views";`,
      `import { renderers as surfaceRenderers } from "./surface-renderers";`,
      `export const renderers = { ...coreRenderers, ...packRenderers, ...surfaceRenderers };`,
    ],
    "kit.ts": [
      `import { createElement } from "react";`,
      `import { PhoneScreen as BasePhoneScreen, type PhoneScreenProps as BasePhoneScreenProps } from "../kit/screen";`,
      `import { components } from "./definitions";`,
      `import { renderers } from "./renderers";`,
      `export * from "../kit";`,
      `export { renderers };`,
      `export type PhoneScreenProps = Omit<BasePhoneScreenProps, "defs" | "renderers">;`,
      `export function PhoneScreen(props: PhoneScreenProps) {`,
      `  return createElement(BasePhoneScreen, { ...props, defs: components, renderers });`,
      `}`,
    ],
  };
  await publishEntries(root, outputs, await generateDoors(root, entries));
}
