import { expect, it } from "vitest";
import { checkSource } from "./ast";

const paths = new Set([
  "/ui/src/own/index.ts",
  "/ui/src/own/helper.ts",
  "/ui/src/own/child/a.ts",
  "/ui/src/other/index.ts",
  "/ui/src/other/helper.ts",
  "/ui/src/loose/helper.ts",
]);
const violations = (source: string, file = "/ui/src/own/a.ts") =>
  checkSource("/ui", file, source, paths).filter(({ rule }) => rule === "folder-imports");
it.each([
  'import { helper } from "./helper";',
  'import { helper } from "../other";',
  'import { helper } from "../other/index";',
  'import { helper } from "../other/index.ts";',
  'import { helper } from "../loose/helper";',
  'import { helper } from "package/deep";',
  'import { helper } from "../other/missing";',
])("allows %s", (source) => expect(violations(source)).toEqual([]));
it.each([
  'import type { Helper } from "../other/helper";',
  'export { helper } from "../other/helper";',
  'const helper = import("../other/helper");',
  'type Helper = typeof import("../other/helper");',
  'import { helper } from "../other/helper.js";',
])("reports %s", (source) => {
  expect(violations(source)).toMatchObject([{ rule: "folder-imports", file: "/ui/src/own/a.ts", line: 1 }]);
});
it("allows imports from an ancestor's own files", () => {
  expect(violations('import { helper } from "../helper";', "/ui/src/own/child/a.ts")).toEqual([]);
});
