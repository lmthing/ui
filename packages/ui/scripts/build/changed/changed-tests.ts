import { execFileSync } from "node:child_process";
import { globSync } from "node:fs";
import { buildCachedEntries } from "../cache";
import { changeGraph } from "./change-graph";
import { nodeTests } from "../check-options";

const workspaceConfig =
  /^(?:package\.json|pnpm-(?:lock|workspace)\.yaml|tsconfig(?:\.[^/]+)?\.json|vitest(?:\.[^/]+)*\.[cm]?[jt]s)$/;
const runnerFile = /^scripts\/build\/(?:index|check(?:-options)?|(?:changed|cache)\/[^/.]+)\.ts$/;
const componentSource =
  /^src\/(?:components|surfaces|packs\/[^/]+\/(?:components|copy))\/([A-Z]\w*)\.[jt]sx?$/;
const componentTest = /\/([A-Z]\w*)(?:\.[^/]+)?\.test\.tsx?$/;
const packPath = /^src\/packs\/([^/]+)\//;
const packData = /^src\/packs\/([^/]+)\/(?:example\.jsonl|pack\.ts|index\.ts|archetypes\/.*)$/;
const recordings = /^test\/(?:recordings\/([^/]+)|known\/([^/]+)\.md)/;
const sharedRuntime = /^src\/(?:catalog\/(?:agent|registry)\/|kit\/(?:interact|part|screen)\/)/;

export function changedPaths(root: string, base: string) {
  const git = (...args: string[]) => execFileSync("git", args, { cwd: root, encoding: "utf8" });
  const ancestor = git("merge-base", "--", base, "HEAD").trim();
  const diff = (...args: string[]) => git("diff", "--no-renames", "--name-only", "-z", ...args).split("\0");
  return [
    ...new Set(
      [
        ...diff(ancestor, "HEAD"),
        ...diff("--cached"),
        ...diff(),
        ...git("ls-files", "--full-name", "--others", "--exclude-standard", "-z").split("\0"),
      ].filter(Boolean),
    ),
  ];
}

export function changeSelection(paths: readonly string[]) {
  const files = new Set<string>(),
    reasons = new Set<string>();
  for (const path of paths) {
    const local = path.replace(/^packages\/ui\//, "");
    const ui = path !== local;
    if (workspaceConfig.test(local) || (ui && (runnerFile.test(local) || local === "test/render.tsx"))) {
      reasons.add(path);
    }
    if (ui) files.add(local);
  }
  return { files: [...files].sort(), reasons: [...reasons].sort() };
}

const componentFiles = ["src/{components,surfaces}/[A-Z]*.tsx", "src/packs/*/components/[A-Z]*.tsx"];

function componentScope(
  files: readonly string[],
  definitions: readonly string[],
  graph: ReturnType<typeof changeGraph>,
) {
  const owners = new Map(
    definitions.map((file) => [file.match(componentSource)![1]!, file.match(packPath)?.[1]]),
  );
  const ids = new Set<string>(),
    packs = new Set<string>();
  for (const file of files) {
    const pack = file.match(packPath)?.[1];
    const recording = file.match(recordings);
    const id =
      file.match(componentSource)?.[1] ?? recording?.[1] ?? recording?.[2] ?? file.match(componentTest)?.[1];
    const definition = componentSource.test(file) && !file.includes("/copy/");
    if (pack && (!id || (!owners.has(id) && !definition))) packs.add(pack);
    if (id && (owners.has(id) || definition || id === "variants")) ids.add(id);
    if (file.startsWith("test/recordings/pack/")) packs.add(file.split("/")[3]!);
  }
  const changed = new Set(files);
  for (const file of definitions) {
    const id = file.match(componentSource)![1]!;
    if (
      packs.has(owners.get(id) ?? "") ||
      [...graph.dependencies(file)].some((dependency) => changed.has(dependency))
    ) {
      ids.add(id);
    }
  }
  return { ids: [...ids].sort(), packs: [...packs].sort(), owners };
}

const caseSuites = [
  "test/archetypes.test.ts",
  "test/conformance.test.tsx",
  "test/language.test.tsx",
  "test/nested.test.ts",
  "test/probes.test.ts",
  "test/reading.test.tsx",
  "test/selection.test.ts",
  "test/variants/conformance.test.tsx",
];

function extraRelated(files: readonly string[], tests: readonly string[]) {
  const related = new Set(files);
  // Recordings and worked examples are read as files or inlined by entry generation, not imported.
  for (const file of files) {
    if (file.startsWith("test/recordings/Archetypes/")) related.add("test/archetypes.test.ts");
    else if (recordings.test(file)) related.add("test/probes.test.ts");
    if (file.startsWith("test/known/")) related.add("test/reading.test.tsx");
    const pack = file.match(packData)?.[1];
    if (pack) {
      related.add("test/probes.test.ts");
      for (const test of tests) {
        if (test.startsWith(`src/packs/${pack}/tests/`) && /\/(?:pack|example)\.test\./.test(test))
          related.add(test);
      }
    }
  }
  return [...related];
}

export function relatedSelection(root: string, files: readonly string[]) {
  const graph = changeGraph(root, files);
  const defs = globSync(componentFiles, { cwd: root }).filter((file) => componentSource.test(file));
  const { ids, packs, owners } = componentScope(files, defs, graph);
  const changed = new Set(files);
  const reached = (test: string) => [...graph.dependencies(test)].filter((file) => changed.has(file));
  const touchedPacks = new Set([...packs, ...ids.map((id) => owners.get(id))]);
  const names = ids.join("|");
  const idReference = names
    ? new RegExp(`(?:\\.\\s*(?:${names})\\b|["'\x60](?:${names})["'\x60])`)
    : undefined;
  const narrowRegistries = ids.length && files.every((file) => file.startsWith("src/"));
  const tests = globSync(nodeTests, { cwd: root, exclude: ["**/*.browser.test.{ts,tsx}"] }).filter((test) => {
    const pack = test.match(packPath)?.[1];
    if (pack || test.startsWith("src/components/")) {
      const id = test.match(componentTest)?.[1];
      if (id && owners.has(id) ? ids.includes(id) : pack && touchedPacks.has(pack)) return true;
    } else if (!narrowRegistries || caseSuites.includes(test)) return true;
    const source = graph.source(test);
    if (reached(test).length || idReference?.test(source)) return true;
    // Keep true registry-wide assertions, even without a literal component name.
    return (
      !pack &&
      /\b(?:createRegistry|registryOf|buildPackIndex|import\.meta\.glob|Object\.(?:keys|values|entries)\((?:components|renderers))\b/.test(
        source,
      )
    );
  });
  const unfiltered = caseSuites.filter((test) =>
    reached(test).some(
      (file) => sharedRuntime.test(file) || (!file.startsWith("src/") && !recordings.test(file)),
    ),
  );
  if (
    files.some(
      (file) => file.startsWith("src/catalog/archetypes/") || file.startsWith("test/recordings/Archetypes/"),
    )
  ) {
    unfiltered.push("test/archetypes.test.ts");
  }
  if (files.some((file) => file.startsWith("src/catalog/probes/"))) {
    unfiltered.push("test/probes.test.ts");
  }
  return { ids, packs, tests, unfiltered, related: extraRelated(files, tests) };
}

export async function prepareChangedRun(root: string, base: string) {
  const { files, reasons } = changeSelection(changedPaths(root, base));
  if (reasons.length) console.log(`Changed tests: full Node suite; forced by ${reasons.join(", ")}`);
  else console.log(`Changed tests: related Node suite; changed files: ${files.join(", ") || "(none)"}`);
  const empty = !reasons.length && !files.length;
  if (empty) return { empty };
  await buildCachedEntries(root);
  await import("../build-themes");
  const plan = reasons.length ? undefined : relatedSelection(root, files);
  if (plan) {
    process.env.UI_TEST_COMPONENTS = plan.ids.join(",");
    process.env.UI_TEST_PACKS = plan.packs.join(",");
    process.env.UI_TEST_UNFILTERED = plan.unfiltered.join(",");
    console.log(
      `Changed scope: components: ${plan.ids.join(", ") || "(none)"}; packs: ${plan.packs.join(", ") || "(none)"}`,
    );
  }
  return { empty, plan };
}
