import { expect, it } from "vitest";
import { z } from "zod";
import { components, stampItemIds, variantProps, type Definition } from "@lmthing/ui/catalog";
import { peekHiddenItems, variantPeekIssues } from "./variant-peek";

const variants = { overflow: ["all", "peek"] } as const;
const fixture: Definition = {
  ...components.List,
  meta: { ...components.List.meta, id: "Fixture", variants, actions: { items: { root: ["press"] } } },
  props: z.strictObject({ ...variantProps(variants), rows: z.array(z.strictObject({ goto: z.string() })) }),
};
const rows = [{ goto: "one" }, { goto: "two" }, { goto: "three" }];
const baseline = { input: { rows }, props: stampItemIds(fixture.meta, fixture.props.parse({ rows })) };
const input = { overflow: "peek", rows };
const read = ["c1 Fixture", "  r1", "  and 2 more"];

it("counts hidden items and preserves their original action targets", () => {
  const { hidden, issues } = peekHiddenItems(["r1", "r2", "r3"], ["home/c1/root", "home/c1/r1/root"]);
  expect(hidden).toEqual(["r2", "r3"]);
  expect(issues).toEqual([]);
  expect(variantPeekIssues(fixture, input, baseline, hidden, read)).toEqual([]);
});

it("catches a missing count, a disclosed hidden row, and a lost hidden action", () => {
  const broken: Definition = {
    ...fixture,
    meta: { ...fixture.meta, actions: { items: { root: ["press"] }, when: { root: { overflow: "all" } } } },
  };
  expect(
    variantPeekIssues(broken, input, baseline, ["r2", "r3"], ['c1 Fixture "Water and 2 more"', "  r2"]),
  ).toEqual([
    "Missing peek count: and 2 more",
    "Peek read still shows hidden item: r2",
    "Peek cannot resolve home/c1/r2 press: not_actionable",
    "Peek cannot resolve home/c1/r3 press: not_actionable",
  ]);
});

it("catches a peek that skips the first row", () => {
  expect(peekHiddenItems(["r1", "r2"], ["home/c1/r2/root"]).issues).toHaveLength(1);
});

it("does not count a row as safely hidden if it still shows addressed parts", () => {
  expect(peekHiddenItems(["r1", "r2"], ["home/c1/r1/root", "home/c1/r2/title"]).issues).toEqual([
    "Peek still renders parts of r2",
  ]);
});

it("tests a hidden index-based select at the value derived for that address", () => {
  const selecting: Definition = {
    ...fixture,
    meta: {
      ...fixture.meta,
      select: { prop: "at", value: "index" },
      actions: { items: { root: ["select"] } },
    },
  };
  expect(variantPeekIssues(selecting, input, baseline, ["r2", "r3"], read)).toEqual([]);
});
