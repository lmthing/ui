import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { changeSelection, relatedSelection } from "./changed-tests";

const roots: string[] = [];
function fixture(files: Record<string, string>) {
  const root = mkdtempSync(join(tmpdir(), "ui-related-"));
  roots.push(root);
  for (const [file, source] of Object.entries(files)) {
    const target = join(root, file);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, source);
  }
  return root;
}
afterEach(() => roots.splice(0).forEach((root) => rmSync(root, { force: true, recursive: true })));

it("keeps only the documented full-run triggers and reports their paths", () => {
  const triggers = [
    "package.json",
    "pnpm-workspace.yaml",
    "pnpm-lock.yaml",
    "tsconfig.base.json",
    "packages/ui/package.json",
    "packages/ui/tsconfig.json",
    "packages/ui/vitest.config.ts",
    "packages/ui/test/render.tsx",
    "packages/ui/scripts/build/check.ts",
    "packages/ui/scripts/build/changed/change-graph.ts",
  ];
  const files = [
    "scripts/build/bundle-check.ts",
    "src/catalog/copy/labels.ts",
    "src/kit/base/KitInput.tsx",
    "src/packs/booking/archetypes/index.ts",
    "src/packs/booking/copy/index.ts",
    "src/packs/booking/lang/en.ts",
    "test/fixtures/cast.ts",
  ];
  expect(
    changeSelection([...triggers, ...files.map((file) => `packages/ui/${file}`), "docs/spec.md"]),
  ).toEqual({
    reasons: [...triggers].sort(),
    files: [
      ...triggers
        .filter((file) => file.startsWith("packages/ui/"))
        .map((file) => file.replace("packages/ui/", "")),
      ...files,
    ].sort(),
  });
});

function sample() {
  return fixture({
    "src/catalog/index.ts": 'export * from "./copy";',
    "src/catalog/copy/index.ts":
      'export { label as buttonLabel } from "./labels"; export { time } from "./time";',
    "src/catalog/copy/labels.ts": 'export const label = "Add";',
    "src/catalog/copy/time.ts": 'export const time = "now";',
    "src/kit/index.ts": 'export * from "./base";',
    "src/kit/base/index.ts": 'export { KitInput } from "./KitInput"; export { KitRow } from "./KitRow";',
    "src/kit/base/KitInput.tsx": "export const KitInput = 1;",
    "src/kit/base/KitRow.tsx": "export const KitRow = 1;",
    "src/packs/booking/lang/en.ts": "export const words = 1;",
    "src/packs/booking/lang/index.ts": 'export * from "./en";',
    "src/packs/booking/components/Waitlist.tsx": 'import * as kit from "../../../kit"; kit.KitInput;',
    "src/packs/booking/components/Slots.tsx": 'import { words } from "../lang";',
    "src/packs/other/components/Card.tsx":
      'import { KitRow } from "../../../kit"; import { buttonLabel } from "../../../catalog";',
    "src/packs/booking/tests/pack.test.ts": 'import { components } from "@lmthing/ui/catalog";',
    "src/packs/booking/tests/Waitlist.test.ts":
      'import { components } from "@lmthing/ui/catalog"; components.Waitlist;',
    "src/packs/other/tests/pack.test.ts": 'import { components } from "@lmthing/ui/catalog";',
    "src/packs/other/tests/Standalone.test.ts": 'import { KitInput } from "@lmthing/ui/kit";',
    "src/kit/controller.test.ts": 'import { components } from "@lmthing/ui/catalog"; components.Card;',
    "src/components/List.tsx": "",
    "src/components/List.test.ts":
      'import { createRegistry } from "@lmthing/ui/catalog"; createRegistry().defs.find((d) => d.meta.id === "List");',
    "src/catalog/registry/scoped-archetypes.test.ts":
      'import { components, registryOf } from "@lmthing/ui/catalog"; registryOf(components);',
    "test/probes.test.ts": "",
  });
}

it.each([
  ["src/packs/booking/components/Waitlist.tsx", ["Waitlist"], []],
  ["src/kit/base/KitInput.tsx", ["Waitlist"], []],
  ["src/packs/booking/lang/en.ts", ["Slots", "Waitlist"], ["booking"]],
  ["src/catalog/copy/labels.ts", ["Card"], []],
] as const)("derives scope for %s without expanding a barrel", (file, ids, packs) => {
  expect(relatedSelection(sample(), [file])).toMatchObject({
    ids,
    packs,
    related: expect.arrayContaining([file]),
  });
});

it("keeps a foreign pack's real import while excluding noise from an aggregate registry", () => {
  const selected = relatedSelection(sample(), ["src/kit/base/KitInput.tsx"]);
  expect(selected.tests).toContain("src/packs/booking/tests/Waitlist.test.ts");
  expect(selected.tests).toContain("src/packs/other/tests/Standalone.test.ts");
  expect(selected.tests).not.toContain("src/packs/other/tests/pack.test.ts");
  expect(selected.tests).not.toContain("src/kit/controller.test.ts");
  expect(selected.tests).not.toContain("src/components/List.test.ts");
  expect(selected.tests).toContain("src/catalog/registry/scoped-archetypes.test.ts");
});

it("runs all reading cases when the shared reader under test changes", () => {
  const root = fixture({
    "src/catalog/index.ts": 'export { readComponent } from "./agent/read";',
    "src/catalog/agent/read.ts": "export const readComponent = () => [];",
    "src/components/List.tsx": "",
    "test/reading.test.tsx": 'import { readComponent } from "@lmthing/ui/catalog";',
  });
  expect(relatedSelection(root, ["src/catalog/agent/read.ts"])).toMatchObject({
    ids: [],
    unfiltered: ["test/reading.test.tsx"],
    related: ["src/catalog/agent/read.ts"],
  });
});

it("adds related edges for recordings and inlined worked examples", () => {
  const root = sample();
  expect(relatedSelection(root, ["test/recordings/Waitlist/model.json"])).toMatchObject({
    ids: ["Waitlist"],
    related: expect.arrayContaining(["test/probes.test.ts"]),
  });
  expect(relatedSelection(root, ["src/packs/booking/example.jsonl"])).toMatchObject({
    packs: ["booking"],
    related: expect.arrayContaining(["src/packs/booking/tests/pack.test.ts", "test/probes.test.ts"]),
  });
});
