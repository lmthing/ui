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

it("allows declared pagination to hide item roots, but not the component root", () => {
  const paging: Meta = { ...meta, variantParts: { "overflow.page": { hides: ["root", "title"] } } };
  const choice = { axis: "overflow", value: "page", item: false } as const;
  expect(variantPartIssues(paging, choice, [root, row, title], [root], { items })).toEqual([]);
  expect(variantPartIssues(paging, choice, [root, row, title], [], { items })).toEqual([
    `Unexpected missing address: ${root}`,
  ]);
});

it("reverses inherited trail part changes only at the overridden row", () => {
  const toggles: Meta = {
    ...meta,
    variantParts: { "trail.toggle": { adds: ["toggle"], hides: ["summary"] } },
  };
  const choice = { axis: "trail", value: "none", item: true } as const;
  const other = "home/c1/r2/root";
  const html = (toggle: boolean, otherToggle: boolean) =>
    renderedAddresses(`
    <div data-testid="${root}">
      <div data-testid="${row}"><span data-testid="home/c1/r1/${toggle ? "toggle" : "summary"}"></span></div>
      <div data-testid="${other}"><span data-testid="home/c1/r2/${otherToggle ? "toggle" : "summary"}"></span></div>
    </div>
  `);
  const options = { items: ["r1", "r2"], item: "r1", inheritedTrail: "toggle" };
  expect(variantPartIssues(toggles, choice, html(true, true), html(false, true), options)).toEqual([]);
  expect(variantPartIssues(toggles, choice, html(true, true), html(false, false), options)).toEqual([
    "Unexpected added address: home/c1/r2/summary",
    "Unexpected missing address: home/c1/r2/toggle",
  ]);
});
