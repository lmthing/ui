import { startVitest } from "vitest/node";
import { fileURLToPath, URL } from "node:url";
import { webResolve } from "../look";
import { execFileSync } from "node:child_process";
import { knownFailureReporter } from "./known-failures";
import {
  checkOptions,
  changeSelection,
  relatedIncludes,
  nodeTests,
  browserTests,
  nodeTestOptions,
} from "./check-options";

function changedSince(base: string) {
  const cwd = fileURLToPath(new URL("../../", import.meta.url));
  const git = (...args: string[]) => execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
  const mergeBase = git("merge-base", base, "HEAD");
  const paths = [
    ...git("diff", "--name-only", mergeBase, "HEAD").split("\n"),
    ...git("diff", "--name-only", "--cached").split("\n"),
    ...git("diff", "--name-only").split("\n"),
    ...git("ls-files", "--others", "--exclude-standard").split("\n"),
  ].filter(Boolean);
  return { mergeBase, ...changeSelection(paths) };
}

export async function check() {
  const options = checkOptions(process.argv.slice(2));
  const selection = options.changed ? changedSince(options.changed) : undefined;
  delete process.env.UI_TEST_COMPONENTS;
  if (selection && !selection.full) process.env.UI_TEST_COMPONENTS = selection.ids.join(",");
  console.log(
    options.browser
      ? "Browser tests: serial files"
      : selection
        ? `Changed tests: ${selection.full ? "full Node suite" : "component-related Node suite"}; components: ${selection.ids.join(", ") || "(none)"}`
        : "Node tests: full suite",
  );
  const runner = await startVitest(
    "test",
    options.filters,
    {
      config: false,
      run: true,
      reporters: ["default", knownFailureReporter()],
      passWithNoTests: Boolean(selection),
      ...(selection && !selection.full ? { changed: selection.mergeBase } : {}),
      ...(options.browser
        ? { fileParallelism: false, maxWorkers: 1, testTimeout: 60000 }
        : nodeTestOptions(process.env)),
      server: { deps: { inline: [/tamagui/, /react-native-svg/] } },
      alias: [
        {
          find: "@lmthing/ui/kit",
          replacement: fileURLToPath(new URL("../../src/entry/kit.ts", import.meta.url)),
        },
        {
          find: "@lmthing/ui/catalog",
          replacement: fileURLToPath(new URL("../../src/entry/catalog.ts", import.meta.url)),
        },
        ...webResolve.alias,
      ],
      include: options.browser
        ? browserTests
        : selection && !selection.full
          ? relatedIncludes(selection.ids, selection.packs)
          : nodeTests,
      exclude: options.browser ? ["**/node_modules/**"] : ["**/node_modules/**", ...browserTests],
    },
    { resolve: webResolve },
  );
  if (!runner) throw new Error("Vitest did not start");
  await runner.close();
}

await check();
