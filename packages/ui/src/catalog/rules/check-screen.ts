import {
  checkWeight,
  checkLimits,
  checkNeighbours,
  checkPlaceholders,
  checkCore,
  checkVariants,
} from "./checks";
import type { ScreenLike } from "../agent";
import type { PackId, PackMeta } from "../meta";
import { migrateScreen } from "../migrations";
import type { Definition } from "../probes";
import { lineCodes, safeParseItemProps } from "../lines";
import {
  definitionsOf,
  resolveDefinition,
  type RegistryLike,
  type Issue,
  type ScreenEntry,
  type RowAddress,
} from "./shared";

export type PackScreenContext = {
  packOf: Readonly<Partial<Record<string, PackId>>>;
  packs: Readonly<Partial<Record<PackId, PackMeta>>>;
};

/** Run each owning pack's checks once, in first appearance order. */
function checkPackScreen(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  { packOf, packs }: PackScreenContext,
): Issue[] {
  const used = new Set(screen.components.map(({ c }) => packOf[c]));
  const validators = [...used].flatMap((id) => (id ? (packs[id]?.screenValidators ?? []) : []));
  if (!validators.length) return [];
  // The limits check already verified these inputs. Only pack checks need their parsed values.
  const parsed = {
    ...screen,
    components: screen.components.map(({ id, c, state, ...input }) => ({
      ...resolveDefinition(defs, c)!.props.parse(input),
      id,
      c,
      ...(state === undefined ? {} : { state }),
    })),
  };
  return validators.flatMap((validate) => validate(parsed));
}

function renderRows(screen: ScreenLike, defs: Record<string, Definition>) {
  const addresses = new Map<
    ScreenEntry,
    (key: string, index: number, part?: PropertyKey) => string | undefined
  >();
  const repairs: Issue[] = [];
  const components = screen.components.map((entry) => {
    const def = resolveDefinition(defs, entry.c);
    if (!def || (!def.meta.items && !def.meta.collections)) return entry;
    const { id, c, state, ...input } = entry;
    const ids = new Map<string, string[]>();
    const rowRoot = (row: string) => `${screen.id}/${id}/${row}`;
    const { wire } = safeParseItemProps(def, input, (key, index, row, repaired) => {
      const rows = ids.get(key) ?? [];
      rows[index] = row;
      ids.set(key, rows);
      if (repaired)
        repairs.push({
          code: lineCodes.strip,
          address: `${rowRoot(row)}/root`,
          message: "Replaced invalid or duplicate item id",
        });
    });
    const sanitized = { ...wire, id, c, ...(state === undefined ? {} : { state }) };
    const parts = new Map(Object.values(def.meta.collections ?? {}).map(({ key, parts }) => [key, parts]));
    if (def.meta.items) parts.set(def.meta.items.key, def.meta.items.parts);
    addresses.set(sanitized, (key, index, part) => {
      const names = parts.get(key);
      if (!names) return;
      const row = ids.get(key)?.[index];
      if (typeof row === "string")
        return `${rowRoot(row)}/${typeof part === "string" && names.includes(part) ? part : "root"}`;
    });
    return sanitized;
  });
  const rowAddress: RowAddress = (entry, key, index, part) => addresses.get(entry)?.(key, index, part);
  return { screen: { ...screen, components }, repairs, rowAddress };
}

/** Reports stable issues and leaves the caller's screen untouched. */
export function checkScreen(
  screen: ScreenLike,
  registry: RegistryLike,
  options: { flowOpensSheet?: boolean; packContext?: PackScreenContext; hostItemIds?: boolean } = {},
): Issue[] {
  const defs = definitionsOf(registry);
  const migrated = {
    ...screen,
    components: migrateScreen(screen, { variantOnly: true }).components.map((entry) => ({
      ...entry,
      c: resolveDefinition(defs, entry.c)?.meta.id ?? entry.c,
    })),
  };
  const render = options.hostItemIds ? renderRows(migrated, defs) : undefined;
  const canonical = render?.screen ?? migrated;
  const limits = checkLimits(canonical, defs, render?.rowAddress);
  return [
    ...limits,
    ...checkWeight(canonical, defs),
    ...checkNeighbours(canonical, defs),
    ...checkCore(canonical, defs, options.flowOpensSheet),
    ...checkPlaceholders(canonical, render?.rowAddress),
    ...checkVariants(canonical, defs, render?.rowAddress),
    ...(options.packContext && !limits.length ? checkPackScreen(canonical, defs, options.packContext) : []),
    ...(render?.repairs ?? []),
  ];
}
