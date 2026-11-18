import { expect, it } from "vitest";
import { checkSource } from "./ast";

const hash = String.fromCharCode(35);
const issues = (source: string, file = "/ui/src/example.tsx") => checkSource("/ui", file, source, new Set());
it.each(["fff", "abcd", "aabbcc", "aabbccdd", "ABCDEF"])("reports a %s hex colour", (hex) => {
  expect(issues(`const color = "${hash}${hex}";`).map(({ rule }) => rule)).toEqual(["hex-colours"]);
});
it("finds every colour in strings and template sections, but not comments or invalid hashes", () => {
  const source = `const colors = \`${hash}fff \${value} ${hash}abcd\`; // ${hash}ffffff\nconst noColor = "${hash}abcdefg ${hash}12";`;
  expect(issues(source).map(({ rule }) => rule)).toEqual(["hex-colours", "hex-colours"]);
});
it.each([
  "const style = { zIndex: 1 };",
  'const style = { "zIndex": -1 };',
  "const zIndex = 1;",
  "const view = <View zIndex={2} />;",
  "style.zIndex = 3;",
  'style["zIndex"] = 4;',
])("reports %s", (source) => expect(issues(source).map(({ rule }) => rule)).toEqual(["numeric-zIndex"]));
it("allows references and exempts only token/theme descendants", () => {
  expect(issues("const style = { zIndex: tokens.layer };")).toEqual([]);
  for (const folder of ["tokens", "themes"])
    expect(
      issues(`const style = { zIndex: 1, color: "${hash}fff" };`, `/ui/src/catalog/${folder}/a.ts`),
    ).toEqual([]);
  expect(issues("const style = { zIndex: 1 };", "/ui/src/catalog/themes-other/a.ts")).toHaveLength(1);
});
