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

it("rejects a peek that shows the same truncated collection as its all reference", () => {
  const truncated = ["home/c1/root", "home/c1/r1/root"];
  expect(peekHiddenItems(["r1", "r2"], truncated, truncated).issues).toEqual([
    "Overflow all is missing home/c1/r2/root",
  ]);
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

it("uses the nested action's bounds when its stored value is below the accepted minimum", () => {
  const bounded: Definition = {
    ...fixture,
    meta: {
      ...fixture.meta,
      items: {
        key: "rows",
        parts: ["root"],
        nested: {
          key: "scores",
          parts: { rate: { action: "set", prop: "rating", min: 1, max: 5, integer: true } },
        },
      },
    },
    props: fixture.props.extend({
      rows: z.array(
        z.strictObject({ goto: z.string(), scores: z.array(z.strictObject({ rating: z.number() })) }),
      ),
    }),
  };
  const all = { rows: rows.map((row) => ({ ...row, scores: [{ rating: 0 }] })) };
  expect(
    variantPeekIssues(
      bounded,
      { ...input, ...all },
      {
        input: all,
        props: stampItemIds(bounded.meta, bounded.props.parse(all)),
      },
      ["r2", "r3"],
      read,
    ),
  ).toEqual([]);
});
