import { expect, it } from "vitest";
import { components, type Meta } from "@lmthing/ui/catalog";
import { renderedAddresses, variantPartIssues } from "./variant-parts";

const meta: Meta = {
  ...components.List.meta,
  variantParts: { "detail.brief": { hides: ["meta"] } },
};
const brief = { axis: "detail", value: "brief", item: false } as const;
const compact = { axis: "density", value: "compact", item: false } as const;
const root = "home/c1/root";
const row = "home/c1/r1/root";
const title = "home/c1/r1/title";
const detail = "home/c1/r1/meta";
const items = ["r1"];

it("catches a renamed or renumbered address even when the part name is allowed", () => {
  const renamed = renderedAddresses(
    `<div data-testid="${root}"><div data-testid="home/c1/r2/root"></div></div>`,
  );
  expect(variantPartIssues(meta, brief, [root, row], renamed, { items })).toContain(
    "Unknown item address: home/c1/r2/root",
  );
});

it("allows the declared part change, but catches other changes and duplicates", () => {
  expect(variantPartIssues(meta, brief, [root, row, title, detail], [root, row, title], { items })).toEqual(
    [],
  );
  expect(variantPartIssues(meta, brief, [root, row, title, detail], [root, row, row], { items })).toEqual([
    "Duplicate part address",
    `Unexpected missing address: ${title}`,
  ]);
});

it("requires identical finish addresses, regardless of their layout order", () => {
  expect(variantPartIssues(meta, compact, [root, row, title], [root, title, row], { items })).toEqual([]);
  expect(variantPartIssues(meta, compact, [root, row, title], [root, row], { items })).toEqual([
    `Unexpected missing address: ${title}`,
  ]);
});
