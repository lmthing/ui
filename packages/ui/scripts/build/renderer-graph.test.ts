import type { Metafile } from "esbuild";
import { expect, it } from "vitest";
import { checkRendererScope, localBundleFiles } from "./renderer-graph";

const imports = (paths: string[]) => paths.map((path) => ({ path, kind: "import-statement" as const }));

it("checks transitive static renderer dependencies without counting lazy or peer imports", () => {
  const entry = "dist/renderers/booking.js",
    shared = "dist/chunks/shared.js",
    leaf = "dist/chunks/leaf.js";
  const meta: Metafile = {
    inputs: {},
    outputs: {
      [entry]: {
        bytes: 0,
        exports: [],
        inputs: {},
        imports: [
          ...imports([shared]),
          { path: "react", kind: "import-statement", external: true },
          { path: "dist/renderers/health.js", kind: "dynamic-import" },
        ],
      },
      [shared]: { bytes: 0, exports: [], inputs: {}, imports: imports([leaf]) },
      [leaf]: {
        bytes: 1,
        exports: [],
        imports: imports([shared]),
        inputs: { "src/packs/booking/components/Waitlist.tsx": { bytesInOutput: 1 } },
      },
    },
  };
  expect([...localBundleFiles(meta, entry)]).toEqual([entry, shared, leaf]);
  expect(() => checkRendererScope(meta, entry, "booking")).not.toThrow();
  expect(() => checkRendererScope(meta, entry, "health")).toThrow("Unexpected booking pack");
  expect(() => checkRendererScope(meta, entry)).toThrow("Unexpected booking pack");
});
