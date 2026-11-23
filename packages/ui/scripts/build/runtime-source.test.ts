import { transform } from "esbuild";
import { expect, it } from "vitest";
import { runtimeSource } from "./runtime-source";

it("removes model fields and private fixture code but keeps shared runtime logic", async () => {
  const result = runtimeSource(
    "Example.tsx",
    `
    import * as c from "../catalog";
    import { prompt } from "../entry/prompt-Example.generated";
    const shared = 3;
    const seed = c.samples.map(() => "example-marker");
    const { answer: alias } = c.probesFor("probe-marker");
    export const meta = { id: "Example", ...c.controls, purpose: prompt.purpose, pick: prompt.pick,
      writeHints: prompt.writeHints, realPath: "real-path-marker", read: () => shared } as const;
    export const examples = [seed, shared];
    function testProbe() { return alias; }
    export const probes = [testProbe()];
    export const fallback = () => { const alias = shared; return alias; };
    export function Example() { return <>{shared}</>; }
  `,
  );
  const { code } = await transform(result, { loader: "tsx" });
  expect(code).not.toMatch(/marker|probe-Example|probesFor|c\.samples|writeHints/);
  expect(code).toContain('purpose: ""');
  expect(code).toContain("const shared = 3");
  expect(code).toContain("const alias = shared");
  expect(code).not.toContain("testProbe");
  expect(code).toContain("function Example()");
});

it("drops the renderer and its private dependencies only for the data entry", () => {
  const source = `
    const renderValue = draw("view-marker");
    export const meta = { id: "Example" };
    export const fallback = () => ({});
    export function Example() { return renderValue; }
  `;
  expect(runtimeSource("Example.tsx", source)).toContain("view-marker");
  const data = runtimeSource("Example.tsx", source, true);
  expect(data).not.toMatch(/view-marker|function Example/);
  expect(data).toContain("fallback");
});

it("keeps runtime pack data while excluding worked examples and archetype probes", () => {
  const door = runtimeSource(
    "index.ts",
    `
    export * from "./archetypes";
    export * from "./components";
    export const example = "worked-example";
  `,
  );
  const data = runtimeSource(
    "pack.ts",
    `
    export const pack = { id: "booking", "example": "example-marker",
      probes: ["probe-marker"], screenValidators: [check], hostRecords: { items: [] } };
  `,
  );
  expect(door).not.toMatch(/worked-example|archetypes/);
  expect(door).toContain("./components");
  expect(data).not.toMatch(/example-marker|probe-marker/);
  expect(data).toContain("screenValidators: [check]");
  expect(data).toContain("hostRecords");
});
