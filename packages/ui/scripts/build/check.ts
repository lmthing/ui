import { startVitest } from "vitest/node";
import { fileURLToPath, URL } from "node:url";
import { webResolve } from "../look";
import { knownFailureReporter } from "./known-failures";
import { checkOptions, nodeTests, browserTests, nodeTestOptions } from "./check-options";

function changedSummary(started: number, count: number) {
  console.log(`Changed tests: ran ${count} tests in ${((performance.now() - started) / 1000).toFixed(2)}s.`);
}

export async function check() {
  const started = performance.now();
  const options = checkOptions(process.argv.slice(2));
  for (const key of ["UI_TEST_COMPONENTS", "UI_TEST_PACKS", "UI_TEST_UNFILTERED"]) delete process.env[key];
  const selection = options.changed
    ? await (
        await import("./changed")
      ).prepareChangedRun(fileURLToPath(new URL("../../", import.meta.url)), options.changed)
    : undefined;
  if (selection?.empty) return changedSummary(started, 0);
  if (!selection) console.log(options.browser ? "Browser tests: serial files" : "Node tests: full suite");
  const runner = await startVitest(
    "test",
    options.filters,
    {
      config: false,
      run: true,
      reporters: ["default", knownFailureReporter()],
      passWithNoTests: Boolean(selection),
      ...(selection?.plan ? { related: selection.plan.related, forceRerunTriggers: [] } : {}),
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
      include: options.browser ? browserTests : (selection?.plan?.tests ?? nodeTests),
      exclude: options.browser ? ["**/node_modules/**"] : ["**/node_modules/**", ...browserTests],
    },
    { resolve: webResolve },
  );
  if (!runner) throw new Error("Vitest did not start");
  if (selection) {
    const count = runner.state
      .getTestModules()
      .reduce(
        (sum, { children }) => sum + [...children.allTests("passed"), ...children.allTests("failed")].length,
        0,
      );
    changedSummary(started, count);
  }
  await runner.close();
}

await check();
