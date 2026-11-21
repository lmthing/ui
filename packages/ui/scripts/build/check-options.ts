export const nodeTests = ["src/**/*.test.{ts,tsx}", "test/**/*.test.{ts,tsx}", "scripts/**/*.test.{ts,tsx}"];
export const browserTests = ["**/*.browser.test.{ts,tsx}"];
const componentPath =
  /^(?:src\/components|src\/packs\/[^/]+\/(?:components|copy))\/([A-Z]\w*)\.(?:tsx?|jsx?)$/;
const componentTest = /(?:^|\/)([A-Z]\w*)(?:\.[^.]+)*\.test\.(?:ts|tsx)$/;

export function checkOptions(args: readonly string[]) {
  const filters: string[] = [];
  let browser = false,
    changed: string | undefined;
  for (let index = 0; index < args.length; index++) {
    const arg = args[index]!;
    if (arg === "--browser") browser = true;
    else if (arg === "--changed") {
      changed = args[index + 1]?.startsWith("--") === false ? args[++index]! : "main";
    } else if (arg.startsWith("--changed=")) changed = arg.slice("--changed=".length) || "main";
    else if (arg.startsWith("--")) throw new Error(`Unknown test option: ${arg}`);
    else filters.push(arg);
  }
  if (browser && changed) throw new Error("--browser and --changed cannot be combined");
  return { browser, changed, filters };
}

function positiveInteger(
  value: string | undefined,
  name: string,
  max: number,
  warn: (message: string) => void,
) {
  if (value === undefined) return undefined;
  const number = Number(value);
  if (/^\d+$/.test(value) && Number.isSafeInteger(number) && number > 0 && number <= max) return number;
  warn(`Ignoring ${name}: expected a positive decimal integer no greater than ${max}.`);
  return undefined;
}

export function nodeTestOptions(env: NodeJS.ProcessEnv, warn = console.warn) {
  // Node turns delays above this limit into 1 ms instead of honoring the requested timeout.
  const timeout = positiveInteger(env.UI_TEST_TIMEOUT, "UI_TEST_TIMEOUT", 2_147_483_647, warn);
  const workers = positiveInteger(env.UI_TEST_WORKERS, "UI_TEST_WORKERS", Number.MAX_SAFE_INTEGER, warn);
  return {
    ...(timeout === undefined ? {} : { testTimeout: timeout, hookTimeout: timeout }),
    ...(workers === undefined ? {} : { maxWorkers: workers }),
  };
}

export function changeSelection(paths: readonly string[]) {
  const ids = new Set<string>(),
    packs = new Set<string>();
  let full = false;
  for (const path of paths) {
    const local = path.replace(/^packages\/ui\//, "");
    if (
      local === path &&
      !path.startsWith("src/") &&
      !path.startsWith("test/") &&
      !path.startsWith("scripts/")
    ) {
      if (["package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "tsconfig.base.json"].includes(path))
        full = true;
      continue;
    }
    const id =
      local.match(componentPath)?.[1] ??
      local.match(/^test\/recordings\/([A-Z]\w*)\//)?.[1] ??
      local.match(componentTest)?.[1];
    if (
      /^(?:src\/kit\/(?:base|interact)|src\/catalog\/(?:agent|meta)|src\/entry|scripts|test\/fixtures)(?:\/|$)/.test(
        local,
      ) ||
      local === "test/render.tsx"
    )
      full = true;
    const pack = local.match(/^src\/packs\/([^/]+)\//)?.[1];
    if (pack) packs.add(pack);
    // A pack file with no component id (lang/, copy door, contracts, READMEs) runs that pack's tests;
    // the pack's own definition (pack.ts, its root door, example.jsonl) still runs everything.
    const packRoot = /^src\/packs\/[^/]+\/(?:pack\.ts|index\.ts|example\.jsonl)$/.test(local);
    if (id) ids.add(id);
    else if (!pack || packRoot) full = true;
  }
  return { full, ids: [...ids].sort(), packs: [...packs].sort() };
}

export function relatedIncludes(ids: readonly string[], packs: readonly string[]) {
  return [
    ...ids.flatMap((id) => [
      `src/**/${id}.test.{ts,tsx}`,
      `src/**/${id}.*.test.{ts,tsx}`,
      `test/**/${id}*.test.{ts,tsx}`,
    ]),
    ...packs.map((pack) => `src/packs/${pack}/tests/**/[a-z]*.test.{ts,tsx}`),
    "test/{conformance,probes,archetypes,reading,nested,selection,variants/conformance}.test.{ts,tsx}",
  ];
}

export function selectedIds<T extends string>(ids: readonly T[]): T[] {
  const selected = process.env.UI_TEST_COMPONENTS?.split(",").filter(Boolean);
  return selected ? ids.filter((id) => selected.includes(id)) : [...ids];
}

export function selectedEntries<T>(entries: Record<string, T>): [string, T][] {
  return Object.entries(entries).filter(([id]) => selectedIds([id]).length);
}

export function selectedLayouts(
  metas: readonly {
    id: string;
    layouts: Record<string, { slots: readonly { allow: readonly string[] }[] }>;
  }[],
): string[] | undefined {
  if (!process.env.UI_TEST_COMPONENTS) return undefined;
  return metas.flatMap((meta) =>
    Object.entries(meta.layouts)
      .filter(([, layout]) => layout.slots.some((slot) => selectedIds(slot.allow).length))
      .map(([layout]) => `${meta.id}/${layout}`),
  );
}
