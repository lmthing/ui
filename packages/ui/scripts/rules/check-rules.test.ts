import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { afterEach, expect, it } from "vitest";
import { checkRules, formatRules } from "./index";

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
  expect(formatRules("/ui", [])).toContain("All rules pass.");
  expect(formatRules("/ui", []).split(": PASS")).toHaveLength(8);
});
