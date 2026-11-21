import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { afterEach, expect, it } from "vitest";
import { checkRules, countViolations, formatRules } from "./index";
import { ruleNames } from "./config";

const folders: string[] = [];
afterEach(async () => {
  await Promise.all(folders.splice(0).map((folder) => rm(folder, { recursive: true, force: true })));
});
it("audits all four roots and reports every violation grouped by rule", async () => {
  const folder = await mkdtemp(resolve(".rules-test-"));
  folders.push(folder);
  const root = join(folder, "packages/ui");
  for (const path of ["src/a.ts", "scripts/b.ts", "test/c.test.ts", "../../apps/gallery/app/d.tsx"]) {
    const file = join(root, path);
    await mkdir(resolve(file, ".."), { recursive: true });
    await writeFile(file, "const style = { zIndex: 1 };\n");
  }
  const violations = await checkRules(root);
  expect(violations).toHaveLength(4);
  expect(violations.every(({ rule }) => rule === "numeric-zIndex")).toBe(true);
  const output = formatRules(root, violations);
  expect(output).toContain("../../apps/gallery/app/d.tsx:1: raw numeric zIndex");
  expect(output).toContain("file-lines: PASS");
  expect(output).toContain("numeric-zIndex: 4 violation(s)");
  expect(output).toContain("4 rule violation(s).");
});
it("prints all rules on a clean tree", () => {
  const result = formatRules("/ui", []);
  expect(result).toContain("All rules pass.");
  for (const rule of ruleNames) expect(result).toContain(`${rule}: PASS\n`);
});
it("reports file and folder warnings without counting them as violations", async () => {
  const root = await mkdtemp(resolve(".rules-test-"));
  folders.push(root);
  const src = join(root, "src");
  await mkdir(src);
  await Promise.all(
    Array.from({ length: 13 }, (_, i) =>
      writeFile(join(src, `file-${i}.ts`), i === 0 ? "// comment\n".repeat(401) : ""),
    ),
  );
  const issues = await checkRules(root);
  const output = formatRules(root, issues);
  expect(output).toContain("file-lines: 1 warning(s)\n  src/file-0.ts:1: 401 lines > 400");
  expect(output).toContain("folder-files: 1 warning(s)\n  src:1: 13 immediate files > 12");
  expect(output).toContain("2 rule warning(s).");
  expect(output).toContain("All rules pass.");
  expect(countViolations(issues)).toBe(0);

  const fn = (lines: number) => `function work() {\n${"  // comment\n".repeat(lines - 2)}}\n`;
  await writeFile(join(src, "file-1.ts"), fn(60));
  expect(countViolations(await checkRules(root))).toBe(0);
  await writeFile(join(src, "file-1.ts"), fn(61));
  const mixed = await checkRules(root);
  expect(countViolations(mixed)).toBe(1);
  const mixedOutput = formatRules(root, mixed);
  expect(mixedOutput).toContain("function-lines: 1 violation(s)\n  src/file-1.ts:1: work: 61 lines > 60");
  expect(mixedOutput).toContain("2 rule warning(s).");
  expect(mixedOutput).toContain("1 rule violation(s).");
  expect(mixedOutput).not.toContain("All rules pass.");
});
it("audits source only and skips recordings, generated files and non-README markdown", async () => {
  const folder = await mkdtemp(resolve(".rules-test-"));
  folders.push(folder);
  const root = join(folder, "packages/ui");
  const ignored = [
    "src/large.generated.ts",
    "src/large.json",
    "src/guide.md",
    "src/script.js",
    "src/script.cts",
    "test/recordings/Example/deep/model.ts",
    "test/recordings/Example/README.md",
  ];
  const included = ["src/a.ts", "src/a.tsx", "src/a.mts", "src/README.md"];
  for (const path of [...ignored, ...included]) {
    const file = join(root, path);
    await mkdir(resolve(file, ".."), { recursive: true });
    await writeFile(file, "x\n".repeat(401));
  }
  const violations = await checkRules(root);
  expect(
    violations
      .filter(({ rule }) => rule === "file-lines")
      .map(({ file }) => file)
      .sort(),
  ).toEqual(included.map((file) => join(root, file)).sort());
  expect(violations.filter(({ rule }) => rule === "readme-lines")).toHaveLength(1);
  expect(violations.every(({ file }) => !ignored.includes(file.slice(root.length + 1)))).toBe(true);
});
