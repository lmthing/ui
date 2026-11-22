import { dataExports, scanEntries } from "./scan-entries";
import { generateDoors } from "./generate-doors";
import { generatePackEntries } from "./generate-pack-entries";
import { publishEntries } from "./publish-entries";

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
    `import { registryOf, packReady as packReadyOf, buildPackIndex as packIndexOf, type RegistryOptions, type PackId } from "../catalog";`,
    `import { components as coreComponents } from "./core";`,
    `import { components as surfaceComponents } from "./surfaces";`,
    `import { components as packComponents, packOf, packs, packArchetypes, packArchetypeOverrides, packComposeProbes, packExamples } from "./packs";`,
    `export * from "../catalog";`,
    `export { packOf, packs, packArchetypes, packArchetypeOverrides, packComposeProbes, packExamples };`,
    // Keep declaration emit from expanding each component schema at the catalog boundary.
    "export const components: typeof coreComponents & typeof packComponents & typeof surfaceComponents = { ...coreComponents, ...packComponents, ...surfaceComponents };",
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

export async function generateEntries(root: string) {
  const entries = await scanEntries(root);
  const core = entries.defs.filter(({ pack, path }) => !pack && !path.includes("/surfaces/"));
  const surfaces = entries.defs.filter(({ path }) => path.includes("/surfaces/"));
  const outputs = {
    ...generatePackEntries(entries),
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
      `import { components } from "./catalog";`,
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
