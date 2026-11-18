import { expect, it } from "vitest";
import { checkSource } from "./ast";

const comments = (count: number) => Array.from({ length: count }, () => "// counted comment").join("\n");
it("counts physical function-node lines, including comments, with an inclusive 60-line boundary", () => {
  const pass = `function pass() {\n${comments(58)}\n}`;
  const fail = `function fail() {\n${comments(59)}\n}`;
  expect(checkSource("/ui", "/ui/src/a.ts", pass, new Set())).toEqual([]);
  expect(checkSource("/ui", "/ui/src/a.test.ts", fail, new Set())).toEqual([
    { rule: "function-lines", file: "/ui/src/a.test.ts", line: 1, detail: "fail: 61 lines > 60" },
  ]);
});
it.each([
  ["const arrow = () => {", "};"],
  ["const expression = function () {", "};"],
  ["const object = { method() {", "} };"],
  ["class C { constructor() {", "} }"],
  ["class C { get value() {", "} }"],
  ["class C { set value(v: number) {", "} }"],
])("checks %s", (start, end) => {
  expect(
    checkSource("/ui", "/ui/src/a.ts", `${start}\n${comments(59)}\n${end}`, new Set()).filter(
      ({ rule }) => rule === "function-lines",
    ),
  ).toHaveLength(1);
});
it("ignores leading comments and strings that contain function-looking text", () => {
  expect(
    checkSource(
      "/ui",
      "/ui/src/a.ts",
      `${comments(70)}\nfunction short() {}\nconst text = "function fake() {}";`,
      new Set(),
    ),
  ).toEqual([]);
  expect(checkSource("/ui", "/ui/test/a.json", comments(100), new Set())).toEqual([]);
});
