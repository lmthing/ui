export const nodeTests = ["src/**/*.test.{ts,tsx}", "test/**/*.test.{ts,tsx}", "scripts/**/*.test.{ts,tsx}"];
export const browserTests = ["**/*.browser.test.{ts,tsx}"];

export function conformanceThemeSet(env: NodeJS.ProcessEnv) {
  return env.UI_TEST_THEMES === "all" ? "all" : "calm-light";
}

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
  if (/^\d+$/.test(value) && number > 0 && number <= max) return number;
  warn(`Ignoring ${name}: expected a positive decimal integer no greater than ${max}.`);
  return undefined;
}

export function nodeTestOptions(env: NodeJS.ProcessEnv, warn = console.warn) {
  // Node turns delays above this limit into 1 ms instead of honoring the requested timeout.
  const timeout = positiveInteger(env.UI_TEST_TIMEOUT, "UI_TEST_TIMEOUT", 2_147_483_647, warn);
  // Vitest allocates pool bookkeeping for every requested worker, even in a filtered run.
  const workers = positiveInteger(env.UI_TEST_WORKERS, "UI_TEST_WORKERS", 256, warn);
  return {
    ...(timeout === undefined ? {} : { testTimeout: timeout, hookTimeout: timeout }),
    ...(workers === undefined ? {} : { maxWorkers: workers }),
  };
}
