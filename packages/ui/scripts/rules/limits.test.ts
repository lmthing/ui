import { expect, it } from "vitest";
import { checkLimits, physicalLines } from "./limits";

it.each([
  ["", 0],
  ["a", 1],
  ["a\n", 1],
  ["a\r\nb\r\n", 2],
  ["\n\n", 2],
])("counts physical file lines", (source, lines) => {
  expect(physicalLines(source as string)).toBe(lines);
});
it("checks file and README limits at the boundary", () => {
  const sources = [
    { file: "/ui/src/ok.ts", source: "x\n".repeat(200) },
    { file: "/ui/src/long.ts", source: "x\n".repeat(201) },
    { file: "/ui/src/a/README.md", source: "x\n".repeat(20) },
    { file: "/ui/src/b/README.md", source: "x\n".repeat(21) },
  ];
  expect(checkLimits("/ui", sources).map(({ rule, file }) => [rule, file])).toEqual([
    ["file-lines", "/ui/src/long.ts"],
    ["readme-lines", "/ui/src/b/README.md"],
  ]);
});
it("counts immediate files only and exempts only the named folders", () => {
  const sources = ["src/ok", "src/big", "src/components", "test/recordings", "src/components/nested"].flatMap(
    (folder) =>
      Array.from({ length: folder === "src/ok" ? 12 : 13 }, (_, i) => ({
        file: `/ui/${folder}/${i}.ts`,
        source: "",
      })),
  );
  expect(checkLimits("/ui", sources).map(({ file, detail }) => [file, detail])).toEqual([
    ["/ui/src/big", "13 immediate files > 12"],
    ["/ui/src/components/nested", "13 immediate files > 12"],
  ]);
});

it.each([
  ["src/packs/health/components", true],
  ["src/packs/x/components", true],
  ["src/packs/x/tests", true],
  ["src/packs/x/tests/components", true],
  ["src/packs/x", false],
  ["src/packs/x/lang", false],
  ["src/packs/x/components/nested", false],
  ["src/packs/x/tests/copy", false],
  ["src/packs/x/tests/components/nested", false],
  ["src/packs/x/nested/components", false],
  ["src/other/packs/x/components", false],
])("applies the pack folder exemption to %s (exempt: %s)", (folder, exempt) => {
  const path = `/ui/${folder}`;
  const sources = Array.from({ length: 13 }, (_, i) => ({ file: `${path}/${i}.ts`, source: "" }));
  expect(checkLimits("/ui", sources)).toEqual(
    exempt ? [] : [{ rule: "folder-files", file: path, line: 1, detail: "13 immediate files > 12" }],
  );
});
