import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { afterEach, expect, it } from "vitest";
import { checkRules, formatRules } from "./index";
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
    await writeFile(file, "x\n".repeat(201));
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
