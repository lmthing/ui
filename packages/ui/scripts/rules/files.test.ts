import { expect, it } from "vitest";
import { isSourceFile } from "./files";

it.each(["a.ts", "a.tsx", "a.mts", "a.d.ts", "README.md", "/ui/folder.generated.ts/a.ts"])(
  "scans %s",
  (file) => {
    expect(isSourceFile(file)).toBe(true);
  },
);
it.each([
  "a.generated.ts",
  "a.test.generated.ts",
  "a.js",
  "a.jsx",
  "a.cts",
  "a.json",
  "a.md",
  "readme.md",
  "README.mdx",
  "a.png",
])("skips %s", (file) => {
  expect(isSourceFile(file)).toBe(false);
});
